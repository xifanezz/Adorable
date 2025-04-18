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

const readFileSchema = z.object({
  path: z
    .string()
    .describe("Path to the file to read")
});

const applyPatchSchema = z.object({
  patch: z
    .string()
    .describe("Patch in OpenAI format starting with *** Begin Patch")
});

export type LsSchema = z.infer<typeof lsSchema>;
export type ReadFileSchema = z.infer<typeof readFileSchema>;
export type ApplyPatchSchema = z.infer<typeof applyPatchSchema>;

export const ADORABLE_TOOLS = {
  ls: tool({
    description: "List files in a directory",
    parameters: lsSchema,
  }),
  readFile: tool({
    description: "Read the contents of a file",
    parameters: readFileSchema,
  }),
  applyPatch: tool({
    description: "Apply changes to files using OpenAI patch format",
    parameters: applyPatchSchema,
  })
};