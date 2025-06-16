"use server";

import { freestyle } from "@/lib/freestyle";

export async function getCodeServerUrl({
  repoId,
  baseId,
}: {
  repoId: string;
  baseId: string;
}): Promise<string> {
  const { codeServerUrl } = await freestyle.requestDevServer({
    repoId: repoId,
    baseId: baseId,
  });

  return codeServerUrl;
}
