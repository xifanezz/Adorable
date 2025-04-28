"use server";

import { freestyle } from "@/lib/freestyle";

export async function requestDevServer({ repoId }: { repoId: string }) {
  const { ephemeralUrl, devCommandRunning, installCommandRunning } =
    await freestyle.requestDevServer({
      repoId: repoId,
    });

  return {
    ephemeralUrl,
    devCommandRunning,
    installCommandRunning,
  };
}
