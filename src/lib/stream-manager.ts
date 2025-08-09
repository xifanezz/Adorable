import { UIMessage } from "ai";
import { after } from "next/server";
import { createResumableStreamContext } from "resumable-stream";
import { redis, redisPublisher } from "./redis";

const streamContext = createResumableStreamContext({
  waitUntil: after,
});

export interface StreamState {
  state: string | null;
}

export interface StreamResponse {
  response(): Response;
}

export interface StreamInfo {
  readableStream(): Promise<ReadableStream>;
  response(): Promise<Response>;
}

/**
 * Get the current stream state for an app
 */
export async function getStreamState(appId: string): Promise<StreamState> {
  const streamState = await redisPublisher.get(`app:${appId}:stream-state`);
  return { state: streamState };
}

/**
 * Check if a stream is currently running for an app
 */
export async function isStreamRunning(appId: string): Promise<boolean> {
  const state = await getStreamState(appId);
  return state.state === "running";
}

/**
 * Stop a running stream for an app
 */
export async function stopStream(appId: string): Promise<void> {
  await redisPublisher.publish(
    `events:${appId}`,
    JSON.stringify({
      type: "abort-stream",
    })
  );
}

/**
 * Wait for a stream to stop running (with timeout)
 */
export async function waitForStreamToStop(
  appId: string,
  maxAttempts: number = 60
): Promise<boolean> {
  let attempts = 0;
  while (attempts < maxAttempts) {
    await new Promise((resolve) => setTimeout(resolve, 500));
    const isRunning = await isStreamRunning(appId);
    if (!isRunning) {
      return true;
    }
    attempts++;
  }
  return false;
}

/**
 * Force clear a stream state (used when timeout is reached)
 */
export async function clearStreamState(appId: string): Promise<void> {
  await redisPublisher.del(`app:${appId}:stream-state`);
}

/**
 * Get an existing stream for an app
 */
export async function getStream(appId: string): Promise<StreamInfo | null> {
  const hasStream = await streamContext.hasExistingStream(appId);
  if (hasStream === true) {
    return {
      async readableStream() {
        const stream = await streamContext.resumeExistingStream(appId);
        if (!stream) {
          throw new Error("Failed to resume existing stream");
        }
        return stream;
      },
      async response() {
        const resumableStream = await streamContext.resumeExistingStream(appId);
        if (!resumableStream) {
          throw new Error("Failed to resume existing stream");
        }
        return new Response(resumableStream, {
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
  return null;
}

/**
 * Set up a new stream for an app
 */
export async function setStream(
  appId: string,
  prompt: UIMessage,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  stream: any
): Promise<StreamResponse> {
  console.log("Setting stream for appId:", appId, "with prompt:", prompt);
  const responseBody = stream.toUIMessageStreamResponse().body;

  if (!responseBody) {
    throw new Error(
      "Error creating resumable stream: response body is undefined"
    );
  }

  await redisPublisher.set(`app:${appId}:stream-state`, "running", {
    EX: 15,
  });

  const resumableStream = await streamContext.createNewResumableStream(
    appId,
    () => {
      return responseBody.pipeThrough(
        new TextDecoderStream()
      ) as ReadableStream<string>;
    }
  );

  if (!resumableStream) {
    throw new Error("Failed to create resumable stream");
  }

  return {
    response() {
      // Set up abort callback directly since this is a synchronous context
      redis.subscribe(`events:${appId}`, (event) => {
        const data = JSON.parse(event);
        if (data.type === "abort-stream") {
          console.log("cancelling http stream");
          resumableStream?.cancel();
        }
      });

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

/**
 * Set up an abort callback for a stream
 */
export async function setupAbortCallback(
  appId: string,
  callback: () => void
): Promise<void> {
  redis.subscribe(`events:${appId}`, (event) => {
    const data = JSON.parse(event);
    if (data.type === "abort-stream") {
      console.log("Stream aborted for appId:", appId);
      callback();
    }
  });
}

/**
 * Update the keep-alive timestamp for a running stream
 */
export async function updateKeepAlive(appId: string): Promise<void> {
  await redisPublisher.set(`app:${appId}:stream-state`, "running", {
    EX: 15,
  });
}

/**
 * Handle stream lifecycle events (start, finish, error)
 */
export async function handleStreamLifecycle(
  appId: string,
  event: "start" | "finish" | "error"
): Promise<void> {
  switch (event) {
    case "start":
      await updateKeepAlive(appId);
      break;
    case "finish":
    case "error":
      await clearStreamState(appId);
      break;
  }
}

/**
 * Utility function to send a message and get a stream response
 * This is used by other parts of the application that need to send messages
 */
export async function sendMessageAndGetStream(
  appId: string,
  mcpUrl: string,
  message: UIMessage
) {
  const { MCPClient } = await import("@mastra/mcp");
  const { builderAgent } = await import("@/mastra/agents/builder");
  const { MessageList } = await import("@mastra/core/agent");

  const mcp = new MCPClient({
    id: crypto.randomUUID(),
    servers: {
      dev_server: {
        url: new URL(mcpUrl),
      },
    },
  });

  const toolsets = await mcp.getToolsets();

  const memory = await builderAgent.getMemory();
  if (memory) {
    await memory.saveMessages({
      messages: [
        {
          content: {
            parts: message.parts,
            format: 3,
          },
          role: "user",
          createdAt: new Date(),
          id: message.id,
          threadId: appId,
          type: "text",
          resourceId: appId,
        },
      ],
    });
  }

  const controller = new AbortController();
  let shouldAbort = false;

  // Set up abort callback
  await setupAbortCallback(appId, () => {
    shouldAbort = true;
  });

  let lastKeepAlive = Date.now();

  const messageList = new MessageList({
    resourceId: appId,
    threadId: appId,
  });

  const stream = await builderAgent.stream([], {
    threadId: appId,
    resourceId: appId,
    maxSteps: 100,
    maxRetries: 0,
    maxOutputTokens: 64000,
    toolsets,
    async onChunk() {
      if (Date.now() - lastKeepAlive > 5000) {
        lastKeepAlive = Date.now();
        await updateKeepAlive(appId);
      }
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async onStepFinish(step: any) {
      messageList.add(step.response.messages, "response");

      if (shouldAbort) {
        await handleStreamLifecycle(appId, "error");
        controller.abort("Aborted stream after step finish");
        const messages = messageList.drainUnsavedMessages();
        console.log(messages);
        if (memory) {
          await memory.saveMessages({
            messages,
          });
        }
      }
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onError: async (event: any) => {
      await mcp.disconnect();
      await handleStreamLifecycle(appId, "error");
      console.error("Error:", event.error);
    },
    onFinish: async () => {
      await handleStreamLifecycle(appId, "finish");
      await mcp.disconnect();
    },
    abortSignal: controller.signal,
  });

  console.log("Stream created for appId:", appId, "with prompt:", message);

  return await setStream(appId, message, stream);
}
