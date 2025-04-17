"use server";

import { appsTable } from "@/db/schema";
import { db } from "@/lib/db";
import { freestyle } from "@/lib/freestyle";

export async function createApp() {
  const repo = await freestyle.createGitRepository("Unnamed App");

  const app = await db
    .insert(appsTable)
    .values({
      gitRepo: repo.repoId,
    })
    .returning();

  return app[0];
}
