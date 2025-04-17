import { pgTable, text, timestamp, uuid, json } from "drizzle-orm/pg-core";
import type { StepResult } from "ai";
import { ADORABLE_TOOLS } from "@/lib/tools";

export const appsTable = pgTable("apps", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull().default("Unnamed App"),
  description: text("description").notNull().default("No description"),
  gitRepo: text("git_repo").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const messagesTable = pgTable("messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  appId: uuid("app_id")
    .notNull()
    .references(() => appsTable.id),
  text: text("text").notNull(),
  steps: json("steps").notNull().$type<StepResult<typeof ADORABLE_TOOLS>[]>(),
  role: text("role").notNull(),
});
