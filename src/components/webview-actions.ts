"use server";

import { freestyle } from "@/lib/freestyle";

export async function requestDevServer({ repoId }: { repoId: string }) {
  const { ephemeralUrl, devCommandRunning, installCommandRunning, mcpEphemeralUrl } =
    await freestyle.requestDevServer({
      repoId: repoId,
    });

  return {
    ephemeralUrl: ephemeralUrl,
    devCommandRunning,
    installCommandRunning,
    mcpUrl: mcpEphemeralUrl,
  };
}

