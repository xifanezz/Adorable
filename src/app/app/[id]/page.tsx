"use server";

import { getApp } from "@/actions/get-app";
import Chat from "../../../components/chat";
import Preview from "../../../components/preview";

export default async function IdPage({ params }: { params: { id: string } }) {
  const app = await getApp(params.id).catch(() => undefined);
  return (
    <div className="flex min-h-screen">
      <div className="w-1/3 border-r ">
        <Chat />
      </div>
      <div className="w-2/3 p-4">
        {/* <Preview /> */}
        {app?.name ?? "App not found"}
      </div>
    </div>
  );
}
