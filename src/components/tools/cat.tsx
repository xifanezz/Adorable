"use client";

import { useState } from "react";
import { CatSchema } from "@/lib/tools";
import { cn } from "@/lib/utils";
import { ChevronDownIcon, ChevronRightIcon, FileIcon } from "lucide-react";
import { ToolInvocation } from "ai";
import { Markdown } from "@/components/ui/markdown";

function getNaturalDescription(args: CatSchema): string {
  return `Reading file: ${args.path}`;
}

function getFileExtension(filename: string): string {
  if (!filename) return "";
  const parts = filename.split(".");
  return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : "";
}

function isMarkdownFile(filename: string): boolean {
  const ext = getFileExtension(filename);
  return ext === "md" || ext === "markdown";
}

function isCodeFile(filename: string): boolean {
  const codeExtensions = [
    "js",
    "jsx",
    "ts",
    "tsx",
    "py",
    "java",
    "c",
    "cpp",
    "cs",
    "go",
    "rb",
    "php",
    "html",
    "css",
    "json",
    "yml",
    "yaml",
  ];
  return codeExtensions.includes(getFileExtension(filename));
}

function getLanguageFromFilename(filename: string): string {
  const ext = getFileExtension(filename);
  const languageMap: Record<string, string> = {
    js: "javascript",
    jsx: "javascript",
    ts: "typescript",
    tsx: "typescript",
    py: "python",
    java: "java",
    c: "c",
    cpp: "cpp",
    cs: "csharp",
    go: "go",
    rb: "ruby",
    php: "php",
    html: "html",
    css: "css",
    json: "json",
    yml: "yaml",
    yaml: "yaml",
  };
  return languageMap[ext] || "";
}

// Combined component that handles both invocation and result
export const CatRenderer = (props: {
  toolInvocation: ToolInvocation;
  className?: string;
}) => {
  const { toolInvocation } = props;
  const args = toolInvocation.args as CatSchema;
  const [expanded, setExpanded] = useState(false);
  const description = getNaturalDescription(args);

  // Get filename from path
  const filename = args.path.split("/").pop() || args.path;

  // Process result data if we have it
  const hasResult = toolInvocation.state === "result";
  let result = hasResult ? toolInvocation.result : null;

  // Extract the actual content if result is an object with content property
  if (result && typeof result === "object" && "content" in result) {
    result = result.content;
  }

  const hasError = result && typeof result === "object" && "error" in result;

  return (
    <div className={cn("flex flex-col", props.className)}>
      <div className="p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 overflow-hidden">
        <div
          className="flex justify-between items-center cursor-pointer"
          onClick={() => hasResult && !hasError && setExpanded(!expanded)}
        >
          <div className="flex items-center gap-2">
            <FileIcon className="h-4 w-4 text-blue-500" />
            <div className="text-sm font-medium">{description}</div>
          </div>

          {hasResult && !hasError && (
            <div className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
              {expanded ? (
                <ChevronDownIcon className="h-4 w-4" />
              ) : (
                <ChevronRightIcon className="h-4 w-4" />
              )}
            </div>
          )}
        </div>

        {/* When there's no result yet */}
        {!hasResult && (
          <div className=" text-sm text-gray-500 dark:text-gray-400 italic">
            Reading file...
          </div>
        )}

        {/* Show error state if there was an error */}
        {hasResult && hasError && (
          <div className="bg-red-50 dark:bg-red-900/20  border border-red-200 dark:border-red-800">
            <p className="text-red-700 dark:text-red-300 text-sm">
              Error: {result.error.message || JSON.stringify(result.error)}
            </p>
          </div>
        )}

        {/* Show file results if we have them */}
        {hasResult && !hasError && expanded && (
          <div className="mt-2 bg-gray-50 dark:bg-gray-800">
            <div className="px-2 pt-1 ">
              <span className="text-xs font-medium text-gray-500">
                {filename}
              </span>
            </div>
            <div className="max-h-96 overflow-y-auto">
              {isMarkdownFile(filename) ? (
                <div className="prose prose-sm dark:prose-invert max-w-full break-words overflow-x-auto pt-0 px-2 pb-2">
                  <Markdown>
                    {typeof result === "string"
                      ? result
                      : JSON.stringify(result)}
                  </Markdown>
                </div>
              ) : isCodeFile(filename) ? (
                <div className="overflow-x-auto pt-0 px-2 pb-2">
                  <pre
                    className="text-xs whitespace-pre-wrap break-words m-0"
                    style={{ maxWidth: "100%" }}
                  >
                    <code className={getLanguageFromFilename(filename)}>
                      {typeof result === "string"
                        ? result
                        : JSON.stringify(result, null, 2)}
                    </code>
                  </pre>
                </div>
              ) : (
                <div className="overflow-x-auto pt-0 px-2 pb-2">
                  <pre
                    className="text-xs whitespace-pre-wrap break-words m-0"
                    style={{ maxWidth: "100%" }}
                  >
                    {typeof result === "string"
                      ? result
                      : JSON.stringify(result, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
