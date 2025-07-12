"use server";

import { memory } from "@/mastra/agents/builder";
import { StreamTextResult, UIMessage } from "ai";
import { after } from "next/server";

import { createResumableStreamContext } from "resumable-stream";
import { redis, redisPublisher } from "./redis";

const streamContext = createResumableStreamContext({
  waitUntil: after,
});

export async function stopStream(appId: string) {
  const message = await getCurrentUserMessage(appId);

  await redisPublisher.publish(
    "events:" + appId,
    JSON.stringify({
      type: "abort-stream",
    })
  );

  if (!message) {
    return;
  }

  await redisPublisher.del("resumable-stream:rs:sentinel:" + message.id);
}

export async function getStream(appId: string) {
  const lastMessage = await getCurrentUserMessage(appId);

  if (!lastMessage) {
    return undefined;
  }

  if (await streamContext.hasExistingStream(lastMessage.id)) {
    return {
      async readableStream() {
        const stream = await streamContext.resumeExistingStream(lastMessage.id);
        return stream;
      },
      async response() {
        const resumableStream = await streamContext.resumeExistingStream(
          lastMessage.id
        );
        let controller: ReadableStreamDefaultController<Uint8Array> | null =
          null;
        let isCancelled = false;

        // Create a new ReadableStream that we can control
        const controllableStream = new ReadableStream<Uint8Array>({
          start(ctrl) {
            controller = ctrl;
          },
          cancel() {
            isCancelled = true;
            // Cancel the original resumable stream
            try {
              resumableStream?.cancel();
            } catch (error) {
              console.log("Error cancelling resumable stream:", error);
            }
          },
        });

        // Set up the abort callback before we start consuming the stream
        getAbortCallback(appId, () => {
          console.log("cancelling http stream");
          isCancelled = true;
          if (controller) {
            try {
              controller.close();
            } catch (error) {
              console.log("Error closing controller:", error);
            }
          }
          try {
            resumableStream?.cancel();
          } catch (error) {
            console.log("Error cancelling resumable stream:", error);
          }
        });

        // Start consuming the resumable stream and pipe it to our controllable stream
        if (resumableStream) {
          const reader = resumableStream.getReader();
          const encoder = new TextEncoder();

          const pump = async () => {
            try {
              while (!isCancelled) {
                const { done, value } = await reader.read();

                if (done || isCancelled) {
                  if (controller && !isCancelled) {
                    controller.close();
                  }
                  break;
                }

                if (controller && !isCancelled) {
                  controller.enqueue(encoder.encode(value));
                }
              }
            } catch (error) {
              if (controller && !isCancelled) {
                controller.error(error);
              }
            } finally {
              reader.releaseLock();
            }
          };

          pump();
        }

        return new Response(controllableStream, {
          headers: {
            "content-type": "text/event-stream",
            "cache-control": "no-cache",
            connection: "keep-alive",
            "x-vercel-ai-ui-message-stream": "v1",
            "x-accel-buffering": "no",
          },
        });
      },
    };
  }
}

export async function setStream(
  appId: string,
  prompt: UIMessage,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  stream: StreamTextResult<any, unknown>
) {
  console.log("Setting stream for appId:", appId, "with prompt:", prompt);
  const responseBody = stream.toUIMessageStreamResponse().body;
  const message = await getCurrentUserMessage(appId);

  if (!message) {
    throw new Error("No current user message found for appId: " + appId);
  }

  if (!responseBody) {
    throw new Error(
      "Error creating resumable stream: response body is undefined"
    );
  }

  const resumableStream = await streamContext.createNewResumableStream(
    message.id,
    () => {
      return responseBody.pipeThrough(
        new TextDecoderStream()
      ) as ReadableStream<string>;
    }
  );

  return {
    response() {
      let controller: ReadableStreamDefaultController<Uint8Array> | null = null;
      let isCancelled = false;

      // Create a new ReadableStream that we can control
      const controllableStream = new ReadableStream<Uint8Array>({
        start(ctrl) {
          controller = ctrl;
        },
        cancel() {
          isCancelled = true;
          // Cancel the original resumable stream
          try {
            resumableStream?.cancel();
          } catch (error) {
            console.log("Error cancelling resumable stream:", error);
          }
        },
      });

      // Set up the abort callback before we start consuming the stream
      getAbortCallback(appId, () => {
        console.log("cancelling http stream");
        isCancelled = true;
        if (controller) {
          try {
            controller.close();
          } catch (error) {
            console.log("Error closing controller:", error);
          }
        }
        try {
          resumableStream?.cancel();
        } catch (error) {
          console.log("Error cancelling resumable stream:", error);
        }
      });

      // Start consuming the resumable stream and pipe it to our controllable stream
      if (resumableStream) {
        const reader = resumableStream.getReader();
        const encoder = new TextEncoder();

        const pump = async () => {
          try {
            while (!isCancelled) {
              const { done, value } = await reader.read();

              if (done || isCancelled) {
                if (controller && !isCancelled) {
                  controller.close();
                }
                break;
              }

              if (controller && !isCancelled) {
                controller.enqueue(encoder.encode(value));
              }
            }
          } catch (error) {
            if (controller && !isCancelled) {
              controller.error(error);
            }
          } finally {
            reader.releaseLock();
          }
        };

        pump();
      }

      return new Response(controllableStream, {
        headers: {
          "content-type": "text/event-stream",
          "cache-control": "no-cache",
          connection: "keep-alive",
          "x-vercel-ai-ui-message-stream": "v1",
          "x-accel-buffering": "no",
        },
        status: 200,
      });
    },
  };
}

export async function getAbortCallback(appId: string, callback: () => void) {
  redis.subscribe("events:" + appId, (event) => {
    const data = JSON.parse(event);
    if (data.type === "abort-stream") {
      console.log("Stream aborted for appId:", appId);
      callback();
    }
  });
}

async function getCurrentUserMessage(appId: string) {
  console.log("getting current user message for appId:", appId);
  const messages = (
    await memory.query({
      threadId: appId,
      resourceId: appId,
      selectBy: {
        last: 100,
      },
    })
  ).uiMessages;

  // Find the last message with role "user"
  const lastMessage = messages
    .filter((message) => message.role === "user")
    .pop();

  if (!lastMessage) {
    console.log("No user messages found for appId:", appId);
    return undefined;
  }

  console.log(lastMessage);

  return lastMessage;
}
