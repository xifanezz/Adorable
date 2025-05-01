"use server";

import { getUser } from "@/auth/stack-auth";
import { appsTable, appUsers, messagesTable } from "@/db/schema";
import { db } from "@/lib/db";
import { eq, and } from "drizzle-orm";

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
            firstMessage: messagesTable.message,
        })
        .from(appUsers)
        .innerJoin(appsTable, eq(appUsers.appId, appsTable.id))
        .leftJoin(
            messagesTable,
            and(
                eq(messagesTable.appId, appsTable.id),
                eq(messagesTable.id,
                    db.select({ id: messagesTable.id })
                        .from(messagesTable)
                        .where(eq(messagesTable.appId, appsTable.id))
                        .orderBy(messagesTable.createdAt)
                        .limit(1)
                )
            )
        )
        .where(eq(appUsers.userId, user.userId));

    return userApps;
}