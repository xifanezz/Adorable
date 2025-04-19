"use server";

import { createApp } from "@/actions/create-app";
import { redirect } from "next/navigation";

export default async function Home() {
  const { id } = await createApp();

  redirect(`/app/${id}`);
}
