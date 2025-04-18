import { saveResponseMessages } from "@/lib/db";
import { ANTHROPIC_MODEL } from "@/lib/model";
import { ADORABLE_TOOLS } from "@/lib/tools";
import { getAppIdFromHeaders } from "@/lib/utils";
import { createIdGenerator, Message, streamText } from "ai";

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

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
    system:
      "You are Styley, the Adorable AI App Builder Assistant. You read the code for a website, and do what you're told to make it better.",
    messages,
  });

  result.consumeStream(); // keep going even if the client disconnects

  return result.toDataStreamResponse();
}
