import { getApp } from "@/actions/get-app";
import { freestyle } from "@/lib/freestyle";
import { getAppIdFromHeaders } from "@/lib/utils";
import { MCPClient } from "@mastra/mcp";
import { builderAgent } from "@/mastra/agents/builder";
import { bufferedResponse } from "@/lib/buffered-response";
import { CoreMessage } from "@mastra/core";

// "fix" mastra mcp bug
import { EventEmitter } from "events";
EventEmitter.defaultMaxListeners = 1000;

export async function POST(req: Request) {
  const appId = getAppIdFromHeaders(req);

  if (!appId) {
    return new Response("Missing App Id header", { status: 400 });
  }

  const app = await getApp(appId);
  if (!app) {
    return new Response("App not found", { status: 404 });
  }

  const { mcpEphemeralUrl, ephemeralUrl } = await freestyle.requestDevServer({
    repoId: app.info.gitRepo,
    baseId: app.info.baseId,
  });

  const { message }: { message: CoreMessage } = await req.json();

  const mcp = new MCPClient({
    id: crypto.randomUUID(),
    servers: {
      dev_server: {
        url: new URL(mcpEphemeralUrl),
      },
    },
  });

  const toolsets = await mcp.getToolsets();

  const rootStream = new TransformStream();

  let fixCount = 0;
  async function runAgent(prompt: Parameters<typeof builderAgent.stream>[0]) {
    const stream = await builderAgent.stream(prompt, {
      threadId: appId,
      resourceId: appId,
      maxSteps: 100,
      maxRetries: 0,
      maxTokens: 64000,

      // experimental_continueSteps: true,
      toolsets,
      onError: async (error) => {
        await mcp.disconnect();
        console.error("Error:", error);
      },
      onFinish: async (res) => {
        console.log("Finished with reason:", res.finishReason);

        if (res.finishReason === "tool-calls" && fixCount < 10) {
          fixCount++;
          runAgent([
            {
              role: "user",
              content: "continue",
            },
          ]);

          return;
        }

        const pageRes = await fetch(ephemeralUrl);

        if (!pageRes.ok && fixCount < 10) {
          fixCount++;
          console.log("the page errored");
          runAgent([
            {
              role: "user",
              content: "The page returned 500. Please fix it.",
            },
          ]);
          return;
        }

        if (fixCount == 10) {
          console.log("reached max fix count, will not retry anymore");
        } else {
          console.log("no detected errors. ending stream");
        }

        await mcp.disconnect();
        // todo: better solution
        await rootStream.writable.abort();
        console.log("Stream ended");
      },
      toolCallStreaming: true,
    });

    stream.toDataStream().pipeThrough(rootStream, {
      preventClose: true,
    });
  }

  runAgent(message.content);

  return new Response(rootStream.readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}

// async function waitUntilUnlocked(stream: WritableStream | ReadableStream) {
//   while (stream.locked) {
//     await new Promise((resolve) => setTimeout(resolve, 10)); // 10ms delay
//   }

//   console.log("Stream is now unlocked");
// }
