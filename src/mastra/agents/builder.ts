import { SYSTEM_MESSAGE } from "@/lib/system";
import { anthropic } from "@ai-sdk/anthropic";
import { Agent } from "@mastra/core/agent";
import { Memory } from "@mastra/memory";
import { TokenLimiter } from "@mastra/memory/processors";
import { PostgresStore, PgVector } from "@mastra/pg";

export const memory = new Memory({
  options: {
    lastMessages: 10,
    semanticRecall: false,
    threads: {
      generateTitle: true,
    },
  },
  vector: new PgVector({
    connectionString: process.env.DATABASE_URL!,
  }),
  storage: new PostgresStore({
    connectionString: process.env.DATABASE_URL!,
  }),
  processors: [new TokenLimiter(64_000)],
});

export const builderAgent = new Agent({
  name: "BuilderAgent",
  model: anthropic("claude-3-7-sonnet-20250219"),
  instructions: SYSTEM_MESSAGE,
  memory,
});
