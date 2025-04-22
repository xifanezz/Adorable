// import { type ToolSet } from "ai";

import { experimental_createMCPClient as createMCPClient } from "ai";

export const ADORABLE_TOOLS = async ({ mcpUrl }: { mcpUrl: string }) => {
  const devServerMcp = await createMCPClient({
    transport: {
      type: "sse",
      url: mcpUrl,
    },
  });
  const devServerTools = await devServerMcp.tools();
  return {
    ...devServerTools,
  };
};
