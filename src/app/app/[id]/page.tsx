"use server";

import { getApp } from "@/actions/get-app";
import AppWrapper from "../../../components/app-wrapper";
import { redirect } from "next/navigation";

export default async function IdPage({ params }: { params: { id: string } }) {
  const app = await getApp(params.id).catch(() => undefined);

  if (!app) {
    redirect("/");
  }

  console.log("Git Repo", app.info.gitRepo);
  return (
    <AppWrapper
      appName={app.info.name}
      repo={process.env.GIT_ROOT + app.info.gitRepo}
      appId={params.id}
    />
  );
}
