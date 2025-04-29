import { createApp } from "@/actions/create-app";
import { redirect } from "next/navigation";
import "@/components/loader.css";

export default async function AppPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] }>;
  params: Promise<{ id: string }>;
}) {
  const { message, baseId } = await searchParams;

  const { id } = await createApp({
    initialMessage: decodeURIComponent(message),
    baseId: baseId as string,
  });

  redirect(`/app/${id}?respond`);
}
