import { getApp } from "@/actions/get-app";
import { saveResponseMessages } from "@/lib/db";
import { freestyle } from "@/lib/freestyle";
import { repairBrokenMessages, truncateFileToolCalls } from "@/lib/message-prompt-utils";
import { ANTHROPIC_MODEL } from "@/lib/model";
import { SYSTEM_MESSAGE } from "@/lib/system";
import { ADORABLE_TOOLS } from "@/lib/tools";
import { getAppIdFromHeaders } from "@/lib/utils";
import { createIdGenerator, Message, streamText } from "ai";
import util from "node:util";

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
    // repoUrl: "https://" + process.env.GIT_ROOT + "/" + app.info.gitRepo,
    repoId: app.info.gitRepo,
  });

  const { messages: originalMessages }: { id: string; messages: Array<Message> } =
    await req.json();

  // Truncate file-related tool calls to reduce token usage
  const truncatedMessages = truncateFileToolCalls(originalMessages);

  repairBrokenMessages(truncatedMessages);

  const result = streamText({
    tools: await ADORABLE_TOOLS({
      mcpUrl: mcpEphemeralUrl,
    }).then(tools => {
      delete tools["directory_tree"];
      return tools;
    }),
    // providerOptions: {
    //   anthropic: {
    //     thinking: { type: 'enabled', budgetTokens: 12000 },
    //   } satisfies AnthropicProviderOptions,
    // },
    onStepFinish: async (step) => {
      console.log(util.inspect({
        stepType: step.stepType,
        text: step.text,
        toolCalls: step.toolCalls,
        toolResults: step.toolResults,
      }, {
        depth: 10,
        colors: true,
      }));
    },
    maxSteps: 20,
    experimental_generateMessageId: createIdGenerator({
      prefix: "server-",
    }),
    toolCallStreaming: true,
    onFinish: async ({ response }) => {
      await saveResponseMessages({
        appId,
        messages: originalMessages,
        responseMessages: response.messages,
      });
    },
    messages: truncatedMessages,
    model: ANTHROPIC_MODEL,
    system: SYSTEM_MESSAGE,
  });

  result.consumeStream(); // keep going even if the client disconnects

  return result.toDataStreamResponse();
}

