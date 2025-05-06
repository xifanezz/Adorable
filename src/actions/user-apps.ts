"use server";

import { getUser } from "@/auth/stack-auth";
import { appsTable, appUsers } from "@/db/schema";
import { db } from "@/lib/db";
import { eq } from "drizzle-orm";

export async function getUserApps() {
  const user = await getUser();

  const userApps = await db
    .select({
      id: appsTable.id,
      name: appsTable.name,
      description: appsTable.description,
      gitRepo: appsTable.gitRepo,
      createdAt: appsTable.createdAt,
      permissions: appUsers.permissions,
    })
    .from(appUsers)
    .innerJoin(appsTable, eq(appUsers.appId, appsTable.id))
    .where(eq(appUsers.userId, user.userId));

  return userApps;
}
