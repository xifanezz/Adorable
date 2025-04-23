import { getApp } from "@/actions/get-app";
import { saveResponseMessages } from "@/lib/db";
import { freestyle } from "@/lib/freestyle";
import { ANTHROPIC_MODEL } from "@/lib/model";
import { SYSTEM_MESSAGE } from "@/lib/system";
import { ADORABLE_TOOLS } from "@/lib/tools";
import { getAppIdFromHeaders } from "@/lib/utils";
import { AnthropicProviderOptions } from "@ai-sdk/anthropic";
import { createIdGenerator, Message, streamText } from "ai";

export async function POST(req: Request) {
  const appId = getAppIdFromHeaders(req);

  if (!appId) {
    return new Response("Missing App Id header", { status: 400 });
  }

  const app = await getApp(appId);
  if (!app) {
    return new Response("App not found", { status: 404 });
  }

  const { url } = await freestyle.requestDevServer({
    repoUrl: "https://" + process.env.GIT_ROOT + "/" + app.info.gitRepo,
  });

  const { messages }: { id: string; messages: Array<Message> } =
    await req.json();

  const result = streamText({
    tools: await ADORABLE_TOOLS({
      mcpUrl: url + "/mcp",
    }),
    onChunk: (chunk) => {
      if (chunk.chunk.type === "reasoning") {
        console.log(chunk.chunk.textDelta)
      }
    },
    providerOptions: {
      anthropic: {
        thinking: { type: 'enabled', budgetTokens: 12000 },
      } satisfies AnthropicProviderOptions,
    },
    maxSteps: 20,
    experimental_generateMessageId: createIdGenerator({
      prefix: "server-",
    }),
    toolCallStreaming: true,
    onFinish: async ({ response }) => {
      await saveResponseMessages({
        appId,
        messages,
        responseMessages: response.messages,
      });
    },
    model: ANTHROPIC_MODEL,
    system: SYSTEM_MESSAGE,
    messages,
  });

  result.consumeStream(); // keep going even if the client disconnects

  return result.toDataStreamResponse();
}
