"use server";

import { getUser } from "@/auth/stack-auth";
import { appsTable, appUsers } from "@/db/schema";
import { db } from "@/lib/db";
import { freestyle } from "@/lib/freestyle";
import { templates } from "@/lib/templates";
import { memory } from "@/mastra/agents/builder";

export async function createApp({
  initialMessage,
  templateId,
}: {
  initialMessage?: string;
  templateId: string;
}) {
  const user = await getUser();

  if (!templates[templateId]) {
    throw new Error(
      `Template ${templateId} not found. Available templates: ${Object.keys(templates).join(", ")}`
    );
  }

  const repo = await freestyle.createGitRepository({
    name: "Unnamed App",
    public: true,
    source: {
      type: "git",
      url: templates[templateId].repo,
    },
  });

  console.log("Created repo", repo);

  await freestyle.grantGitPermission({
    identityId: user.freestyleIdentity,
    repoId: repo.repoId,
    permission: "write",
  });

  await freestyle.requestDevServer({
    repoId: repo.repoId,
  });
  console.log("dev server ready");

  const token = await freestyle.createGitAccessToken({
    identityId: user.freestyleIdentity,
  });

  const app = await db.transaction(async (tx) => {
    const appInsertion = await tx
      .insert(appsTable)
      .values({
        gitRepo: repo.repoId,
        name: initialMessage,
      })
      .returning();

    await tx
      .insert(appUsers)
      .values({
        appId: appInsertion[0].id,
        userId: user.userId,
        permissions: "admin",
        freestyleAccessToken: token.token,
        freestyleAccessTokenId: token.id,
        freestyleIdentity: user.freestyleIdentity,
      })
      .returning();

    return appInsertion[0];
  });

  await memory.createThread({
    threadId: app.id,
    resourceId: app.id,
  });

  return app;
}
