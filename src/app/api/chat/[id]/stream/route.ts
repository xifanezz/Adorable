import { getStream, stopStream } from "@/lib/streams";
import { NextRequest } from "next/server";

let lastRecieivedAt = Date.now();

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (Date.now() - lastRecieivedAt < 500) {
    console.log(
      "Blocked too frequent request to chat stream to prevent ai sdk resume bug."
    );
    return new Response(null, {
      status: 204,
      headers: {
        "Cache-Control": "no-cache",
        "Content-Type": "text/plain",
      },
    });
  }

  console.log("GET stream for appId:", (await params).id);
  const currentStream = await getStream((await params).id);

  if (!currentStream) {
    return new Response();
  }

  lastRecieivedAt = Date.now();
  return currentStream?.response();
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const appId = (await params).id;

  await stopStream(appId);

  return new Response(null, {
    status: 204,
    headers: {
      "Cache-Control": "no-cache",
      "Content-Type": "text/plain",
    },
  });
}
