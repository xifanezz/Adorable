import { messagesTable } from "@/db/schema";
import { db } from "@/lib/db";
import { ADORABLE_TOOLS } from "@/lib/tools";
import { anthropic } from "@ai-sdk/anthropic";
import { StepResult, streamText } from "ai";

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

export async function POST(req: Request) {
  const appId = req.headers.get("appId");
  if (!appId) {
    return new Response("Missing appId header", { status: 400 });
  }

  const { messages } = await req.json();

  // We'll use streamText as it's the simplest API for this purpose
  const result = streamText({
    tools: ADORABLE_TOOLS,
    onFinish: async (step) => {
      console.log(
        "Message saved",
        await db
          .insert(messagesTable)
          .values({
            appId: appId,
            role: "assistant",
            text: step.text,
            steps: step.steps,
          })
          .returning()
      );
    },
    model: anthropic("claude-3-7-sonnet-20250219"),
    system:
      "You are a helpful assistant who provides concise and accurate responses.",
    messages,
  });

  result.consumeStream();

  return result.toDataStreamResponse();
}
