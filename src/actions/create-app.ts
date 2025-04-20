"use server";

import { appsTable, messagesTable } from "@/db/schema";
import { db } from "@/lib/db";
import { freestyle } from "@/lib/freestyle";

export async function createApp({
  initialMessage,
}: {
  initialMessage?: string;
}) {
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

  const appInsertion = await db
    .insert(appsTable)
    .values({
      gitRepo: repo.repoId,
    })
    .returning();

  const app = appInsertion[0];

  if (initialMessage) {
    const id = `init-${crypto.randomUUID()}`;
    await db
      .insert(messagesTable)
      .values({
        appId: app.id,
        id,
        message: {
          role: "user",
          id,
          content: initialMessage,
          parts: [
            {
              type: "text",
              text: initialMessage,
            },
          ],
        },
      })
      .returning()
      .catch((e) => {
        console.error("Error inserting initial message:", JSON.stringify(e));
        throw new Error("Failed to insert initial message");
      });
  }

  return app;
}
