"use server";

import { getApp } from "@/actions/get-app";
import AppWrapper from "../../../components/app-wrapper";
import { redirect } from "next/navigation";
import { repairBrokenMessages } from "@/app/api/chat/route";
import { unstable_ViewTransition as ViewTransition } from "react";
import { freestyle } from "@/lib/freestyle";
import { db } from "@/lib/db";
import { appUsers } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getUser } from "@/auth/stack-auth";

export default async function AppPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [key: string]: string | string[] }>;
}) {
  const { id } = await params;

  const user = await getUser();

  const userPermission = (
    await db
      .select()
      .from(appUsers)
      .where(eq(appUsers.userId, user.userId))
      .limit(1)
  ).at(0);

  if (!userPermission?.permissions) {
    return (
      <div>
        Project not found or you don&apos;t have permission to access it.
      </div>
    );
  }

  const { respond } = await searchParams;
  const app = await getApp(id).catch(() => undefined);

  const { codeServerUrl } = await freestyle.requestDevServer({
    repoId: app?.info.gitRepo,
    baseId: app?.info.baseId,
  });

  if (!app) {
    redirect("/");
  }

  repairBrokenMessages(app.messages);

  return (
    <ViewTransition>
      <AppWrapper
        baseId={app.info.baseId}
        codeServerUrl={codeServerUrl}
        appName={app.info.name}
        initialMessages={app.messages}
        respond={respond != undefined}
        repo={app.info.gitRepo}
        appId={app.info.id}
        repoId={app.info.gitRepo}
      />
    </ViewTransition>
  );
}
