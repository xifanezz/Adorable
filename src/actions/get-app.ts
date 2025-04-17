"use server";

import { appsTable } from "@/db/schema";
import { db } from "@/lib/db";
import { eq } from "drizzle-orm";

export async function getApp(id: string) {
  const app = await db
    .select()
    .from(appsTable)
    .where(eq(appsTable.id, id))
    .limit(1);
  if (!app) {
    throw new Error("App not found");
  }
  return app[0];
}
