import { getApp } from "@/actions/get-app";
import { freestyle } from "@/lib/freestyle";
import { getAppIdFromHeaders } from "@/lib/utils";
import { MCPClient } from "@mastra/mcp";
import { builderAgent } from "@/mastra/agents/builder";
import { StepResult, ToolSet, UIMessage } from "ai";

// "fix" mastra mcp bug
import { EventEmitter } from "events";
import { getAbortCallback, setStream, stopStream } from "@/lib/streams";
EventEmitter.defaultMaxListeners = 1000;

import { NextRequest } from "next/server";
import { redisPublisher } from "@/lib/redis";

let lastRequestTime = 0;

export async function POST(req: NextRequest) {
  const currentTime = Date.now();
  if (currentTime - lastRequestTime < 100) {
    console.log("Throttling request to chat API");
    console.log("Last request time:", lastRequestTime);
    console.log("Current request time:", currentTime);
    console.log("Time since last request:", currentTime - lastRequestTime);
    return new Response("Please wait before sending another request", {
      status: 429,
    });
  }
  lastRequestTime = currentTime;

  console.log("creating new chat stream");
  const appId = getAppIdFromHeaders(req);

  if (!appId) {
    return new Response("Missing App Id header", { status: 400 });
  }

  const app = await getApp(appId);
  if (!app) {
    return new Response("App not found", { status: 404 });
  }

  const streamState = await redisPublisher.get(
    "app:" + appId + ":stream-state"
  );

  if (streamState === "running") {
    console.log("Stopping previous stream for appId:", appId);
    stopStream(appId);

    // Wait until stream state is cleared
    const maxAttempts = 60;
    let attempts = 0;
    while (attempts < maxAttempts) {
      await new Promise((resolve) => setTimeout(resolve, 500));
      const updatedState = await redisPublisher.get(
        "app:" + appId + ":stream-state"
      );
      if (updatedState !== "running") {
        break;
      }
      attempts++;
    }

    // If stream is still running after max attempts, return an error
    if (attempts >= maxAttempts) {
      return new Response(
        "Previous stream is still shutting down, please try again",
        { status: 429 }
      );
    }
  }

  // todo: don't allow multiple streams at a time
  // ? how do we know if a stream is still running or if it errored?
  // const currentStream = await getStream(appId);
  // if (currentStream) {
  //   console.log("Stream already exists for appId:", appId);
  //   return await currentStream.response();
  // }

  const { messages }: { messages: UIMessage[] } = await req.json();

  const { mcpEphemeralUrl } = await freestyle.requestDevServer({
    repoId: app.info.gitRepo,
  });

  const resumableStream = await sendMessage(
    appId,
    mcpEphemeralUrl,
    messages.at(-1)!
  );

  return resumableStream.response();
}

export async function sendMessage(
  appId: string,
  mcpUrl: string,
  message: UIMessage
) {
  const mcp = new MCPClient({
    id: crypto.randomUUID(),
    servers: {
      dev_server: {
        url: new URL(mcpUrl),
      },
    },
  });

  const toolsets = await mcp.getToolsets();

  await builderAgent.getMemory()?.saveMessages({
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

  const controller = new AbortController();
  let shouldAbort = false;
  await getAbortCallback(appId, () => {
    shouldAbort = true;
  });

  const steps: StepResult<ToolSet>[] = [];
  const stream = await builderAgent.stream([], {
    threadId: appId,
    resourceId: appId,
    maxSteps: 100,
    maxRetries: 0,
    maxOutputTokens: 64000,
    toolsets,
    // savePerStep: true,
    async onStepFinish(step) {
      steps.push(step);
      step.createdAt = new Date();

      if (shouldAbort) {
        await builderAgent.getMemory()?.saveMessages({
          messages: steps
            .map((step) => {
              console.log(JSON.stringify(step.content, null, 2));
              return step;
            })
            .map((step) => ({
              content: step.content.filter((part) => part.type !== "tool-call"),
              role: "assistant",
              createdAt: step.createdAt,
              id: crypto.randomUUID(),
              threadId: appId,
              type: "v3",
              resourceId: appId,
            })),
          format: "v2",
        });
        await redisPublisher.del(`app:${appId}:stream-state`);
        controller.abort("Aborted stream after step finish");
      }
    },
    // stopWhen: (step) => {
    //   return step.steps.some(s => s.toolResults?.some(r => r.output?.context.stop === true));
    // },
    onError: async (error) => {
      await mcp.disconnect();
      await redisPublisher.del(`app:${appId}:stream-state`);
      console.error("Error:", error);
    },
    onFinish: async () => {
      await redisPublisher.del(`app:${appId}:stream-state`);
      await mcp.disconnect();
    },
    abortSignal: controller.signal,
  });

  console.log("Stream created for appId:", appId, "with prompt:", message);

  return await setStream(appId, message, stream);
}
