import { messagesTable } from "@/db/schema";
import { db } from "@/lib/db";
import { ADORABLE_TOOLS } from "@/lib/tools";
import { anthropic } from "@ai-sdk/anthropic";
import {
  appendResponseMessages,
  createIdGenerator,
  Message,
  streamText,
} from "ai";
import { sql } from "drizzle-orm";

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

export async function POST(req: Request) {
  const appId = req.headers.get("Adorable-App-Id");
  if (!appId) {
    return new Response("Missing appId header", { status: 400 });
  }

  const { messages }: { id: string; messages: Array<Message> } =
    await req.json();

  const result = streamText({
    tools: ADORABLE_TOOLS,
    maxSteps: 15,
    experimental_generateMessageId: createIdGenerator({
      prefix: "server-",
    }),
    // onFinish({ response: { messages } }) {},
    onFinish: async ({ response }) => {
      const newMsgs = appendResponseMessages({
        messages: messages,
        responseMessages: response.messages,
      });

      console.log("New messages", newMsgs);
      const res = await db
        .insert(messagesTable)
        .values(
          newMsgs.map((message) => ({
            appId: appId,
            id: message.id,
            createdAt: new Date(message.createdAt as unknown as string),
            message,
          }))
        )
        .onConflictDoUpdate({
          target: messagesTable.id,
          set: {
            message: sql`excluded.message`,
          },
        })
        .returning();
      console.log("HAVING NOW INSERTED", JSON.stringify(res));
    },

    model: anthropic("claude-3-7-sonnet-20250219"),
    system:
      "You are a helpful assistant who provides concise and accurate responses.",
    messages,
  });

  result.consumeStream();

  return result.toDataStreamResponse();
}
