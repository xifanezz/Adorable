"use server";

import { freestyle } from "@/lib/freestyle";

export async function requestDevServer({
  repoId,
  baseId,
}: {
  repoId: string;
  baseId: string;
}) {
  const {
    ephemeralUrl,
    devCommandRunning,
    installCommandRunning,
    codeServerUrl,
  } = await freestyle.requestDevServer({
    repoId: repoId,
    baseId: baseId,
  });

  return {
    ephemeralUrl,
    devCommandRunning,
    installCommandRunning,
    codeServerUrl,
  };
}
