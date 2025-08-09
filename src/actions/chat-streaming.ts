"use server";

import { getStreamState } from "@/lib/stream-manager";

export async function chatState(appId: string) {
  const streamState = await getStreamState(appId);
  return streamState;
}
