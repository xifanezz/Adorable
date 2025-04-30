"use server";

import { appsTable, messagesTable } from "@/db/schema";
import { db } from "@/lib/db";
import { freestyle } from "@/lib/freestyle";

export async function createApp({
  initialMessage,
  baseId,
}: {
  initialMessage?: string;
  baseId: string;
}) {
  console.time("create git repo");
  const repo = await freestyle
    .createGitRepository({
      name: "Unnamed App",
      public: true,
      source: {
        url: {
          "nextjs-dkjfgdf": "https://github.com/freestyle-sh/freestyle-next",
          "vite-skdjfls": "https://github.com/freestyle-sh/freestyle-base-vite-react-typescript-swc",
          "expo-lksadfp": "https://github.com/freestyle-sh/freestyle-expo",
        }[baseId] ?? "https://github.com/freestyle-sh/freestyle-next",
        type: "git",
      },
    })
    .catch((e) => {
      console.error("Error creating git repository:", JSON.stringify(e));
      throw new Error("Failed to create git repository");
    });
  console.timeEnd("create git repo");

  console.time("start dev server");

  // remapping baseIds because we don't have base image for expo yet
  const BASE_IDS = {
    "nextjs-dkjfgdf": "nextjs-dkjfgdf",
    "vite-skdjfls": "vite-skdjfls",
    "expo-lksadfp": "vite-skdjfls",
  }


  await freestyle.requestDevServer({
    repoId: repo.repoId,
    baseId: BASE_IDS[baseId],
  }).then(() => {
    console.timeEnd("start dev server");
  });

  const appInsertion = await db
    .insert(appsTable)
    .values({
      gitRepo: repo.repoId,
    })
    .returning();

  const app = appInsertion[0];

  console.time("insert initial message");
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
  console.timeEnd("insert initial message");

  return app;
}
