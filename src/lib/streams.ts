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
        const stream = await streamContext.resumeExistingStream(lastMessage.id);

        return new Response(stream, {
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
  if (!responseBody) {
    throw new Error(
      "Error creating resumable stream: response body is undefined"
    );
  }

  const resumableStream = await streamContext.createNewResumableStream(
    prompt.id,
    () => {
      return responseBody.pipeThrough(
        new TextDecoderStream()
      ) as ReadableStream<string>;
    }
  );

  return {
    response() {
      return new Response(resumableStream, {
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

export async function getStreamAbortSignal(appId: string) {
  const controller = new AbortController();

  redis.subscribe("events:" + appId, (event) => {
    const data = JSON.parse(event);
    if (data.type === "abort-stream") {
      console.log("Stream aborted for appId:", appId);
      controller.abort("Stream aborted by server");
    }
  });

  return controller.signal;
}

async function getCurrentUserMessage(appId: string) {
  const lastMessage = (
    await memory.query({
      threadId: appId,
      resourceId: appId,
      selectBy: {
        last: 1,
      },
    })
  ).uiMessages.at(0);

  if (lastMessage?.role !== "user") {
    return undefined;
  }

  return lastMessage;
}
