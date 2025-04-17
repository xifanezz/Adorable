"use server";

import { getApp } from "@/actions/get-app";
import AppWrapper from "../../../components/app-wrapper";
import { redirect } from "next/navigation";

export default async function IdPage({ params }: { params: { id: string } }) {
  const app = await getApp(params.id).catch(() => undefined);

  if (!app) {
    redirect("/");
  }

  console.log("Git Repo", app.gitRepo);
  return (
    <AppWrapper appName={app.name} repo={process.env.GIT_ROOT + app.gitRepo} />
  );
}
