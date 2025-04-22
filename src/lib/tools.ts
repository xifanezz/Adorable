// import { type ToolSet } from "ai";

import { experimental_createMCPClient as createMCPClient, JSONRPCMessage, MCPTransport } from "ai";
// import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

// class SSETransport implements MCPTransport {
//   client: Client;
//   transport: StreamableHTTPClientTransport;

//   constructor(client: Client) {
//     this.client = client;
//   }

//   close(): Promise<void> {
//     return this.client.close()


//   }

//   send(message: JSONRPCMessage): Promise<void> {
//     console.log(message);
//     // this.client.fallbackRequestHandler()
//   }
//   start(): Promise<void> {
//     return this.client.connect()
//   }
// }


export const ADORABLE_TOOLS = async ({ mcpUrl }: { mcpUrl: string }) => {
  const devServerMcp = await createMCPClient({
    transport: new StreamableHTTPClientTransport(new URL(mcpUrl)),
  });
  const devServerTools = await devServerMcp.tools();
  return {
    ...devServerTools,
  };
};
