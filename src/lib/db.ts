import { drizzle } from "drizzle-orm/node-postgres";
import { appendResponseMessages, Message } from "ai";
import { messagesTable } from "@/db/schema";
import { sql } from "drizzle-orm";

export const db = drizzle(process.env.DATABASE_URL!);

export async function saveMessages({
  appId,
  newMsgs,
}: {
  appId: string;
  newMsgs: Message[];
}) {
  return await db
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
}

export async function saveResponseMessages({
  appId,
  messages,
  responseMessages,
}: {
  appId: string;
  messages: Message[];
  responseMessages: Parameters<
    typeof appendResponseMessages
  >[0]["responseMessages"];
}) {
  const newMsgs = appendResponseMessages({
    messages,
    responseMessages,
  });

  // Fix broken tool calls
  for (const message of responseMessages) {
    if (message.role === "tool") {
      for (const content of message.content) {
        if (!content.result) {
          content.isError = true;
          content.result = {
            content: [{ type: "text", text: "unknown error" }],
            isError: true,
          }
        }
      }
    }
  }

  return await saveMessages({ appId, newMsgs });
}
