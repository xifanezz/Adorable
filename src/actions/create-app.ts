"use server";

import { appsTable } from "@/db/schema";
import { db } from "@/lib/db";
import { freestyle } from "@/lib/freestyle";

export async function createApp() {
  const repo = await freestyle
    .createGitRepository({
      name: "Unnamed App",
      public: true,
      source: {
        url: "https://github.com/freestyle-sh/freestyle-next",
        type: "git",
      },
    })
    .catch((e) => {
      console.error("Error creating git repository:", JSON.stringify(e));
      throw new Error("Failed to create git repository");
    });

  // start the dev server as soon as possible
  freestyle.requestDevServer({
    repoUrl: process.env.GIT_ROOT + "/" + repo.repoId,
  });

  const app = await db
    .insert(appsTable)
    .values({
      gitRepo: repo.repoId,
    })
    .returning();

  return app[0];
}
