"use server";

import { getApp } from "@/actions/get-app";
import Chat from "../../../components/chat";
import Preview from "../../../components/preview";
import { redirect } from "next/navigation";

export default async function IdPage({ params }: { params: { id: string } }) {
  const app = await getApp(params.id).catch(() => undefined);

  if (!app) {
    redirect("/");
  }

  return (
    <div className="flex min-h-screen">
      <div className="w-1/3 border-r ">
        <Chat />
      </div>
      <div className="w-2/3 px-4 pt-4">
        <Preview repo={app?.gitRepo} />
      </div>
    </div>
  );
}
