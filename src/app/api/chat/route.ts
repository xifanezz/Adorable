import { saveResponseMessages } from "@/lib/db";
import { ANTHROPIC_MODEL } from "@/lib/model";
import { ADORABLE_TOOLS } from "@/lib/tools";
import { getAppIdFromHeaders } from "@/lib/utils";
import { createIdGenerator, Message, streamText } from "ai";

export async function POST(req: Request) {
  const appId = getAppIdFromHeaders(req);
  if (!appId) {
    return new Response("Missing App Id header", { status: 400 });
  }

  const { messages }: { id: string; messages: Array<Message> } =
    await req.json();

  const result = streamText({
    tools: ADORABLE_TOOLS,
    maxSteps: 15,

    experimental_generateMessageId: createIdGenerator({
      prefix: "server-",
    }),
    onFinish: async ({ response }) => {
      await saveResponseMessages({
        appId,
        messages,
        responseMessages: response.messages,
      });
    },

    model: ANTHROPIC_MODEL,
    system: `You are Styley, the Adorable AI App Builder Assistant. You read the code for a website, and do what you're told to make it better. You have the ability to view and modify files in the user's project.

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

  result.consumeStream(); // keep going even if the client disconnects

  return result.toDataStreamResponse();
}
