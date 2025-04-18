"use client";

import { useState } from "react";
import { LsSchema } from "@/lib/tools";
import { cn } from "@/lib/utils";
import {
  ChevronDownIcon,
  ChevronRightIcon,
  FileIcon,
  FolderIcon,
} from "lucide-react";
import { ToolInvocation } from "ai";

function formatPath(path?: string): string {
  if (!path) return "current directory";
  const cleanPath = path.replace(/\/+$/, "");
  return cleanPath || "root directory";
}

function getNaturalDescription(args: LsSchema): string {
  const path = formatPath(args.path);
  const showHidden = args.showHidden ? ", including hidden files" : "";
  const sort = args.sort ? `, sorted by ${args.sort}` : "";
  const limit = args.limit ? `, showing up to ${args.limit} items` : "";

  return `Listing contents of ${path}${showHidden}${sort}${limit}`;
}

type FileEntry = {
  name: string;
  type: "file" | "directory";
  size?: number;
  modified?: string;
};

function formatFileSize(bytes?: number): string {
  if (bytes === undefined) return "";
  if (bytes < 1024) return bytes + " B";
  const kb = bytes / 1024;
  if (kb < 1024) return kb.toFixed(1) + " KB";
  const mb = kb / 1024;
  if (mb < 1024) return mb.toFixed(1) + " MB";
  const gb = mb / 1024;
  return gb.toFixed(1) + " GB";
}

function FilesystemEntry({ entry }: { entry: FileEntry }) {
  return (
    <div className="flex items-center space-x-2 p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
      {entry.type === "directory" ? (
        <FolderIcon className="h-4 w-4 text-blue-500 flex-shrink-0" />
      ) : (
        <FileIcon className="h-4 w-4 text-gray-500 flex-shrink-0" />
      )}
      <span className="text-sm truncate">{entry.name}</span>
      {entry.size !== undefined && (
        <span className="text-xs text-gray-500 ml-auto">
          {formatFileSize(entry.size)}
        </span>
      )}
    </div>
  );
}

// Combined component that handles both invocation and result
export const LsRenderer = (props: {
  toolInvocation: ToolInvocation;
  className?: string;
}) => {
  const { toolInvocation } = props;
  const args = toolInvocation.args as LsSchema;
  const [expanded, setExpanded] = useState(false);
  const description = getNaturalDescription(args);
  
  // Process result data if we have it
  const hasResult = toolInvocation.state === "result";
  const result = hasResult ? toolInvocation.result : null;
  const hasError = result && result.error;
  
  // Parse files if we have a result
  const files: FileEntry[] = hasResult && Array.isArray(result)
    ? result.map((item) => ({
        name: item.name || item.path?.split("/").pop() || "unnamed",
        type: item.type === "tree" || item.isDirectory ? "directory" : "file",
        size: item.size,
        modified: item.modified,
      }))
    : [];

  // Count directories and files
  const dirCount = files.filter((f) => f.type === "directory").length;
  const fileCount = files.filter((f) => f.type === "file").length;

  // Sort files: directories first, then alphabetically
  const sortedFiles = [...files].sort((a, b) => {
    if (a.type === "directory" && b.type === "file") return -1;
    if (a.type === "file" && b.type === "directory") return 1;
    return a.name.localeCompare(b.name);
  });

  const hasFiles = files.length > 0;

  return (
    <div className={cn("flex flex-col", props.className)}>
      <div className="p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900">
        <div className="text-sm font-medium">{description}</div>
        
        {/* When there's no result yet */}
        {!hasResult && (
          <div className="mt-2 text-sm text-gray-500 dark:text-gray-400 italic">
            Searching...
          </div>
        )}
        
        {/* Show error state if there was an error */}
        {hasResult && hasError && (
          <div className="mt-2 bg-red-50 dark:bg-red-900/20 p-3 rounded-md border border-red-200 dark:border-red-800">
            <p className="text-red-700 dark:text-red-300 text-sm">
              Error: {result.error.message || JSON.stringify(result.error)}
            </p>
          </div>
        )}
        
        {/* Show file results if we have them */}
        {hasResult && !hasError && (
          <div className="mt-2">
            <div
              className="flex items-center justify-between bg-gray-50 dark:bg-gray-800 p-2 rounded cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700"
              onClick={() => setExpanded(!expanded)}
            >
              <div className="flex items-center gap-1.5">
                {expanded ? (
                  <ChevronDownIcon className="h-4 w-4 text-gray-500" />
                ) : (
                  <ChevronRightIcon className="h-4 w-4 text-gray-500" />
                )}
                <span className="text-sm font-medium">
                  {hasFiles
                    ? `Found ${dirCount} ${dirCount === 1 ? 'directory' : 'directories'} and ${fileCount} ${fileCount === 1 ? 'file' : 'files'}`
                    : "No files found"}
                </span>
              </div>
              <span className="text-xs text-gray-500">
                {expanded ? "Click to collapse" : "Click to expand"}
              </span>
            </div>

            {expanded && hasFiles && (
              <div className="mt-2 p-2 bg-gray-50 dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700 max-h-60 overflow-y-auto">
                {sortedFiles.map((file, i) => (
                  <FilesystemEntry key={i} entry={file} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};