import { anthropic } from "@ai-sdk/anthropic";
import { streamText } from "ai";

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

export async function POST(req: Request) {
  const { messages } = await req.json();

  const result = streamText({
    model: anthropic("claude-3-7-sonnet-20250219"),
    system: "You are a helpful assistant.",
    messages,
  });

  return result.toDataStreamResponse();
}
