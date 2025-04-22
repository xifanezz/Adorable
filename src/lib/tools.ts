// import { type ToolSet } from "ai";

import { experimental_createMCPClient as createMCPClient } from "ai";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

export const ADORABLE_TOOLS = async ({ mcpUrl }: { mcpUrl: string }) => {
  const devServerMcp = await createMCPClient({
    transport: new StreamableHTTPClientTransport(new URL(mcpUrl)),
  });
  const devServerTools = await devServerMcp.tools();
  return {
    ...devServerTools,
  };
};
