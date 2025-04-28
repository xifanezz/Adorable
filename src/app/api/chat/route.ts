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

  const { mcpEphemeralUrl } = await freestyle.requestDevServer({
    // repoUrl: "https://" + process.env.GIT_ROOT + "/" + app.info.gitRepo,
    repoId: app.info.gitRepo,
  });

  const { messages }: { id: string; messages: Array<Message> } =
    await req.json();

  repairBrokenMessages(messages);

  const result = streamText({
    tools: await ADORABLE_TOOLS({
      mcpUrl: mcpEphemeralUrl,
    }).then(tools => {
      delete tools["directory_tree"];
      return tools;
    }),
    providerOptions: {
      anthropic: {
        thinking: { type: 'enabled', budgetTokens: 12000 },
      } satisfies AnthropicProviderOptions,
    },
    onStepFinish: async (step) => {
      console.log({
        stepType: step.stepType,
        text: step.text,
        toolCalls: step.toolCalls,
        toolResults: step.toolResults,
      });
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
    messages: messages,
    model: ANTHROPIC_MODEL,
    system: SYSTEM_MESSAGE,
  });

  result.consumeStream(); // keep going even if the client disconnects

  return result.toDataStreamResponse();
}

export function repairBrokenMessages(messages: Message[]) {
  for (const message of messages) {
    if (message.role !== "assistant" || !message.parts) continue;

    for (const part of message.parts) {
      if (part.type !== "tool-invocation") continue;
      if (part.toolInvocation.state === "result" && part.toolInvocation.result) continue;

      part.toolInvocation = {
        ...part.toolInvocation,
        state: "result",
        result: {
          content: [
            { type: "text", text: "unknown error" },],
          isError: true,
        }
      }
    }
  }
}
