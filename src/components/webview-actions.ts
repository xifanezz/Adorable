"use server";

import { freestyle } from "@/lib/freestyle";

export async function requestDevServer({ repoUrl }: { repoUrl: string }) {
  const { url, devCommandRunning, installCommandRunning } =
    await freestyle.requestDevServer({
      repoUrl,
    });

  return {
    ephemeralUrl: url,
    devCommandRunning,
    installCommandRunning,
    mcpUrl: url + "/mcp",
  };
}
