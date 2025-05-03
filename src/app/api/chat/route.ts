import { getApp } from "@/actions/get-app";
import { saveResponseMessages } from "@/lib/db";
import { freestyle } from "@/lib/freestyle";
import { ANTHROPIC_MODEL } from "@/lib/model";
import { SYSTEM_MESSAGE } from "@/lib/system";
import { getAppIdFromHeaders } from "@/lib/utils";
import { Message } from "ai";
import { createIdGenerator } from "ai";
import { Agent } from "@mastra/core/agent";
import { MCPClient } from "@mastra/mcp";

// Improved transformer with adaptive pacing based on available content
function createDelayedStream(originalStream: ReadableStream<Uint8Array>) {
  const textDecoder = new TextDecoder();
  const chunkBuffer: Uint8Array[] = [];
  let processingBuffer = false;
  let totalAvailableLines = 0;

  // Count newlines in a chunk of text
  function countNewlines(text: string): number {
    return (text.match(/\\n/g) || []).length;
  }

  // Process the buffer and send chunks with adaptive delays
  async function processBuffer(controller: ReadableStreamDefaultController<Uint8Array>) {
    if (processingBuffer || chunkBuffer.length === 0) return;

    processingBuffer = true;

    while (chunkBuffer.length > 0) {
      const chunk = chunkBuffer.shift()!;
      const text = textDecoder.decode(chunk.slice(), { stream: true });

      // Only add delays for tool call content with newlines
      if (text.includes("argsTextDelta") && text.includes('\\n')) {
        // Calculate delay based on available content in the buffer
        const chunkLines = countNewlines(text);

        // Decrease available line count
        totalAvailableLines = Math.max(0, totalAvailableLines - chunkLines);

        // Use an inverse exponential curve for smooth transition:
        // - As available lines approach 0, delay approaches MAX_DELAY
        // - As available lines increase, delay approaches MIN_DELAY
        const MIN_DELAY = 100;  // Minimum delay in ms
        const MAX_DELAY = 1500; // Maximum delay in ms
        const CURVE_FACTOR = 0.15; // Controls how quickly the curve transitions

        // Reserve at least 1 line to ensure we never fully catch up
        const adjustedLines = Math.max(totalAvailableLines - 1, 0);

        // Calculate delay: MAX_DELAY when lines=0, approaches MIN_DELAY as lines increase
        const delay = MIN_DELAY + (MAX_DELAY - MIN_DELAY) * Math.exp(-CURVE_FACTOR * adjustedLines);

        // Add a small random variation (±10%) to make it feel more natural
        const variationFactor = 0.9 + (Math.random() * 0.2); // 0.9 to 1.1
        const finalDelay = Math.round(delay * variationFactor);

        await new Promise((resolve) => setTimeout(resolve, finalDelay));
      }

      controller.enqueue(chunk);
    }

    processingBuffer = false;
  }

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      const reader = originalStream.getReader();

      // Start a separate process to read from the original stream as fast as possible
      (async () => {
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) {
              // When done, wait for buffer to empty before closing
              while (chunkBuffer.length > 0 || processingBuffer) {
                await new Promise(r => setTimeout(r, 10));
              }
              controller.close();
              break;
            }

            // Count available newlines in incoming chunk
            const text = textDecoder.decode(value.slice(), { stream: true });
            if (text.includes("argsTextDelta") && text.includes('\\n')) {
              totalAvailableLines += countNewlines(text);
            }

            // Add chunk to buffer immediately without waiting
            chunkBuffer.push(value);

            // Trigger buffer processing if not already running
            processBuffer(controller);
          }
        } catch (error) {
          controller.error(error);
        }
      })();
    },

    cancel() {
      // Clear buffer if stream is cancelled
      chunkBuffer.length = 0;
    }
  });
}

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

  const mcp = new MCPClient({
    servers: {
      dev_server: {
        url: new URL(mcpEphemeralUrl),
      },
    },
  });

  // Create a Mastra Agent instance
  const agent = new Agent({
    name: "BuilderAgent",
    model: ANTHROPIC_MODEL,
    instructions: SYSTEM_MESSAGE,
    tools: await mcp.getTools(),
  });

  const stream = await agent.stream(messages, {
    maxSteps: 100,
    maxRetries: 0,
    // onChunk: async (chunk) => {
    //   // if (chunk.chunk.type === "tool-call-delta") {
    //   //   console.log(chunk.chunk.argsTextDelta);
    //   // }
    //   // if (chunk.chunk.type === "tool-call") {
    //   //   console.log("Tool call: ", chunk.chunk?.args?.path);
    //   // }
    //   if (chunk.chunk.type === "tool-call-streaming-start" && (chunk.chunk.toolName === "dev_server_write_file" && chunk.chunk.)) {
    //     // console.log("Tool call: ", chunk.chunk.toolName);
    //   }
    // },
    onError: async (error) => {
      console.error("Error: ", error);
      await mcp.disconnect();
    },
    onFinish: async ({ response }) => {
      await saveResponseMessages({
        appId,
        messages: messages,
        responseMessages: response.messages,
      });
      await mcp.disconnect();
    },
    experimental_generateMessageId: createIdGenerator({
      prefix: "server-",
    }),
    toolCallStreaming: true,
  });

  // Get the underlying ReadableStream from the StreamTextResult
  const originalReadableStream = stream.toDataStream();

  // Create a new stream with our delay logic
  const delayedReadableStream = createDelayedStream(originalReadableStream);

  // Return the transformed stream as the response
  return new Response(delayedReadableStream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}

