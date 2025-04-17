import { messagesTable } from "@/db/schema";
import { db } from "@/lib/db";
import { ADORABLE_TOOLS } from "@/lib/tools";
import { anthropic } from "@ai-sdk/anthropic";
import {
  AssistantContent,
  convertToCoreMessages,
  Message,
  StepResult,
  streamText,
} from "ai";

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

export async function POST(req: Request) {
  const appId = req.headers.get("Adorable-App-Id");
  if (!appId) {
    return new Response("Missing appId header", { status: 400 });
  }

  const { messages, id }: { id: string; messages: Array<Message> } =
    await req.json();

  // get the last message, if it exists
  const lastMessage = messages.slice(-1)[0];
  console.log("Last message", lastMessage);
  const coreLastMessage = convertToCoreMessages([lastMessage])[0];
  console.log("Core last message", coreLastMessage);
  await db
    .insert(messagesTable)
    .values({
      appId: appId,
      id: id,
      createdAt: new Date(),
      message: convertToCoreMessages([lastMessage])[0],
    })
    .returning();

  // We'll use streamText as it's the simplest API for this purpose
  const result = streamText({
    tools: ADORABLE_TOOLS,
    // onFinish({ response: { messages } }) {},
    onStepFinish: async ({ response }) => {
      for (const message of response.messages) {
        console.log(
          "Message saved",
          await db
            .insert(messagesTable)
            .values({
              appId: appId,

              id: message.id,
              createdAt: new Date(),
              message,
            })
            .returning()
        );
      }
    },

    model: anthropic("claude-3-7-sonnet-20250219"),
    system:
      "You are a helpful assistant who provides concise and accurate responses.",
    messages,
  });

  result.consumeStream();

  return result.toDataStreamResponse();
}
