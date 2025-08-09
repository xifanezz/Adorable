import { getApp } from "@/actions/get-app";
import { freestyle } from "@/lib/freestyle";
import { getAppIdFromHeaders } from "@/lib/utils";
import { MCPClient } from "@mastra/mcp";
import { builderAgent } from "@/mastra/agents/builder";
import { UIMessage } from "ai";

// "fix" mastra mcp bug
import { EventEmitter } from "events";
import {
  isStreamRunning,
  stopStream,
  waitForStreamToStop,
  clearStreamState,
  setupAbortCallback,
  updateKeepAlive,
  handleStreamLifecycle,
  setStream,
} from "@/lib/stream-manager";
EventEmitter.defaultMaxListeners = 1000;

import { NextRequest } from "next/server";
import { MessageList } from "@mastra/core/agent";

export async function POST(req: NextRequest) {
  console.log("creating new chat stream");
  const appId = getAppIdFromHeaders(req);

  if (!appId) {
    return new Response("Missing App Id header", { status: 400 });
  }

  const app = await getApp(appId);
  if (!app) {
    return new Response("App not found", { status: 404 });
  }

  // Check if a stream is already running and stop it if necessary
  if (await isStreamRunning(appId)) {
    console.log("Stopping previous stream for appId:", appId);
    await stopStream(appId);

    // Wait until stream state is cleared
    const stopped = await waitForStreamToStop(appId);
    if (!stopped) {
      await clearStreamState(appId);
      return new Response(
        "Previous stream is still shutting down, please try again",
        { status: 429 }
      );
    }
  }

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

async function sendMessage(appId: string, mcpUrl: string, message: UIMessage) {
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
    async onStepFinish(step) {
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
    onError: async (error) => {
      await mcp.disconnect();
      await handleStreamLifecycle(appId, "error");
      console.error("Error:", error);
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
