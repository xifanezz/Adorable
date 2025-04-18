// import { type ToolSet } from "ai";

import { tool } from "ai";
import { z } from "zod";

const lsSchema = z.object({
  path: z
    .string()
    .optional()
    .describe(
      "Directory path to list. Defaults to current directory if not specified."
    ),
  showHidden: z
    .boolean()
    .optional()
    .describe(
      "Whether to show hidden files (files starting with .). Default: false"
    ),
  sort: z
    .enum(["name", "size", "modified", "none"])
    .optional()
    .describe("How to sort the results. Default: name"),
  limit: z
    .number()
    .int()
    .positive()
    .optional()
    .describe("Maximum number of entries to return. Default: no limit"),
});

const catSchema = z.object({
  path: z.string().describe("Path to the file to read"),
});

export type LsSchema = z.infer<typeof lsSchema>;
export type CatSchema = z.infer<typeof catSchema>;

export const ADORABLE_TOOLS = {
  ls: tool({
    description: "List files in a directory",
    parameters: lsSchema,
  }),
  cat: tool({
    description: "Read a file",
    parameters: catSchema,
  }),
};
