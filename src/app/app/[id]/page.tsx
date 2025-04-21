"use server";

import { getApp } from "@/actions/get-app";
import AppWrapper from "../../../components/app-wrapper";
import { redirect } from "next/navigation";

export default async function AppPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { [key: string]: string | string[] };
}) {
  const { id } = params;
  const { respond } = searchParams;
  const app = await getApp(id).catch(() => undefined);

  if (!app) {
    redirect("/");
  }

  return (
    <AppWrapper
      appName={app.info.name}
      initialMessages={app.messages}
      respond={respond != undefined}
      repo={process.env.GIT_ROOT + "/" + app.info.gitRepo}
      appId={app.info.id}
      repoId={app.info.gitRepo}
    />
  );
}
