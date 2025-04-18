"use server";

import { getApp } from "@/actions/get-app";
import AppWrapper from "../../../components/app-wrapper";
import { redirect } from "next/navigation";

export default async function IdPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const app = await getApp(id).catch(() => undefined);

  if (!app) {
    redirect("/");
  }

  return (
    <AppWrapper
      appName={app.info.name}
      initialMessages={app.messages}
      repo={process.env.GIT_ROOT + app.info.gitRepo}
      appId={app.info.id}
      repoId={app.info.gitRepo}
    />
  );
}
