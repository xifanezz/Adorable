import { getApp } from "@/actions/get-app";
import { freestyle } from "@/lib/freestyle";
import { getAppIdFromHeaders } from "@/lib/utils";
import { MCPClient } from "@mastra/mcp";
import { builderAgent } from "@/mastra/agents/builder";
import { convertToModelMessages, UIMessage } from "ai";

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

  const { messages }: { messages: UIMessage[] } = await req.json();

  const mcp = new MCPClient({
    id: crypto.randomUUID(),
    servers: {
      dev_server: {
        url: new URL(mcpEphemeralUrl),
      },
    },
  });

  const toolsets = await mcp.getToolsets();

  const stream = await builderAgent.stream(
    convertToModelMessages([messages.at(-1)!]),
    {
      threadId: appId,
      resourceId: appId,
      maxSteps: 100,
      maxRetries: 0,
      maxOutputTokens: 64000,
      toolsets,
      onError: async (error) => {
        await mcp.disconnect();
        console.error("Error:", error);
      },
      onFinish: async () => {
        await mcp.disconnect();
      },
    }
  );

  return stream.toUIMessageStreamResponse();
}

export async function GET(req: Request) {
  const appId = getAppIdFromHeaders(req);
  if (!appId) {
    return new Response("Missing App Id header", { status: 400 });
  }

  return new Response(
    JSON.stringify({
      stream: streams[appId] && {
        prompt: streams[appId].prompt,
      },
    })
  );
}
