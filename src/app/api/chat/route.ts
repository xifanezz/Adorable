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

  const { messages }: { id: string; messages: Array<Message> } =
    await req.json();

  // get the last message, if it exists
  const lastMessage = messages.slice(-1)[0];

  await db
    .insert(messagesTable)
    .values({
      appId: appId,
      id: crypto.randomUUID(),
      createdAt: new Date(),
      message: convertToCoreMessages([lastMessage])[0],
    })
    .returning();

  // We'll use streamText as it's the simplest API for this purpose
  const result = streamText({
    tools: ADORABLE_TOOLS,
    maxSteps: 15,
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
    system: `You are a helpful assistant who helps users build web applications. 
You have the ability to view and modify files in the user's project.

Available tools:
- ls: List files in a directory
- readFile: Read the contents of a file
- applyPatch: Apply changes to files using the OpenAI patch format

When modifying files:
1. First use ls to understand the file structure
2. Use readFile to view file contents
3. Use applyPatch to make changes to files

Your patch format should follow this structure:
*** Begin Patch
*** Add File: path/to/new/file
+This is the content of the new file
+With multiple lines if needed
*** Update File: path/to/existing/file
 Context line before (keep the space at the beginning)
-Line to remove (note the minus sign)
+Line to add (note the plus sign)
 Context line after (keep the space at the beginning)
*** Delete File: path/to/file/to/delete
*** End Patch

IMPORTANT: Every time you make a change using applyPatch, the system will automatically:
1. Commit the changes to git with an appropriate commit message
2. Push the changes to the remote repository

This happens automatically after each patch is applied, so you don't need to worry about manually triggering commits or pushes.

Always respond in a helpful, concise manner. Provide clear explanations for your code changes.`,
    messages,
  });

  result.consumeStream();

  return result.toDataStreamResponse();
}