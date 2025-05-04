import { getApp } from "@/actions/get-app";
import { freestyle } from "@/lib/freestyle";
import { getAppIdFromHeaders } from "@/lib/utils";
import { MCPClient } from "@mastra/mcp";
import { builderAgent } from "@/mastra/agents/builder";
import { bufferedResponse } from "@/lib/buffered-response";
import { CoreMessage } from "@mastra/core";

export async function POST(req: Request) {
  const appId = getAppIdFromHeaders(req);

  if (!appId) {
    return new Response("Missing App Id header", { status: 400 });
  }

  const app = await getApp(appId);
  if (!app) {
    return new Response("App not found", { status: 404 });
  }

  const { mcpEphemeralUrl } = await freestyle.requestDevServer({
    repoId: app.info.gitRepo,
    baseId: app.info.baseId,
  });

  const { message }: { message: CoreMessage } = await req.json();

  const mcp = new MCPClient({
    servers: {
      dev_server: {
        url: new URL(mcpEphemeralUrl),
      },
    },
  });

  const toolsets = await mcp.getToolsets();

  const stream = await builderAgent.stream(message.content, {
    threadId: appId,
    resourceId: appId,
    maxSteps: 100,
    maxRetries: 3,
    experimental_continueSteps: true,
    toolsets,
    onError: (error) => {
      console.error("Error:", error);
    },
    onFinish: async ({ finishReason }) => {
      console.log("Finished with reason:", finishReason);
      await mcp.disconnect();
    },
    toolCallStreaming: true,
  });

  return bufferedResponse(stream.toDataStream());
}
