"use server";

import { getApp } from "@/actions/get-app";
import AppWrapper from "../../../components/app-wrapper";
import { redirect } from "next/navigation";
import { repairBrokenMessages } from "@/app/api/chat/route";

export default async function AppPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [key: string]: string | string[] }>;
}) {
  const { id } = await params;
  const { respond } = await searchParams;
  const app = await getApp(id).catch(() => undefined);

  if (!app) {
    redirect("/");
  }

  repairBrokenMessages(app.messages);

  return (
    <AppWrapper
      appName={app.info.name}
      initialMessages={app.messages}
      respond={respond != undefined}
      repo={"https://" + process.env.GIT_ROOT + "/" + app.info.gitRepo}
      appId={app.info.id}
      repoId={app.info.gitRepo}
    />
  );
}
