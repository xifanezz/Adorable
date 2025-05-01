"use server";

import { getUser } from "@/auth/stack-auth";
import { appsTable, appUsers, messagesTable } from "@/db/schema";
import { db } from "@/lib/db";
import { freestyle } from "@/lib/freestyle";


export async function createApp({
  initialMessage,
  baseId,
}: {
  initialMessage?: string;
  baseId: string;
}) {
  const user = await getUser();

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

  await freestyle.grantGitPermission({
    identityId: user.freestyleIdentity,
    repoId: repo.repoId,
    permission: "write",
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

  const token = await freestyle.createGitAccessToken({
    identityId: user.freestyleIdentity,
  });

  const app = await db.transaction(async (tx) => {
    const appInsertion = await tx.insert(appsTable)
      .values({
        gitRepo: repo.repoId,
      })
      .returning();

    await tx.insert(appUsers).values({
      appId: appInsertion[0].id,
      userId: user.userId,
      permissions: "admin",
      freestyleAccessToken: token.token,
      freestyleAccessTokenId: token.id,
      freestyleIdentity: user.freestyleIdentity,
    }).returning();

    return appInsertion[0];
  });

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
