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

  const gitId = await freestyle.createGitIdentity();
  await freestyle.grantGitPermission({
    identityId: gitId.id,
    repoId: repo.repoId,
    permission: "write"
  });
  const token = await freestyle.createGitAccessToken({
    identityId: gitId.id,
  });

  const url = `https://${gitId.id}:${token.token}@${process.env.GIT_ROOT}/${repo.repoId}`;
  // start the dev server as soon as possible
  await freestyle.requestDevServer({
    repoUrl: url,
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
          createdAt: new Date(),
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
