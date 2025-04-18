"use client";

import { cn } from "@/lib/utils";
import { FileIcon, FolderIcon } from "lucide-react";

type FileEntry = {
  name: string;
  type: "file" | "directory";
  size?: number;
  modified?: string;
};

export function FilesystemEntry({ entry }: { entry: FileEntry }) {
  return (
    <div className="flex items-center space-x-2 p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800">
      {entry.type === "directory" ? (
        <FolderIcon className="h-4 w-4 text-blue-500" />
      ) : (
        <FileIcon className="h-4 w-4 text-gray-500" />
      )}
      <span className="text-sm">{entry.name}</span>
      {entry.size && (
        <span className="text-xs text-gray-500 ml-auto">
          {formatFileSize(entry.size)}
        </span>
      )}
    </div>
  );
}

export function FilesystemListing({
  files,
  className,
}: {
  files: FileEntry[];
  className?: string;
}) {
  // Sort directories first, then files
  const sortedFiles = [...files].sort((a, b) => {
    if (a.type === "directory" && b.type === "file") return -1;
    if (a.type === "file" && b.type === "directory") return 1;
    return a.name.localeCompare(b.name);
  });

  return (
    <div className={cn("border rounded-md overflow-hidden", className)}>
      <div className="bg-gray-50 dark:bg-gray-850 border-b px-4 py-2">
        <h3 className="text-sm font-medium">Files</h3>
      </div>
      <div className="p-2 max-h-60 overflow-y-auto">
        {sortedFiles.length === 0 ? (
          <p className="text-sm text-gray-500 p-2">No files found</p>
        ) : (
          sortedFiles.map((file, index) => (
            <FilesystemEntry key={index} entry={file} />
          ))
        )}
      </div>
    </div>
  );
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + " B";
  const kb = bytes / 1024;
  if (kb < 1024) return kb.toFixed(1) + " KB";
  const mb = kb / 1024;
  if (mb < 1024) return mb.toFixed(1) + " MB";
  const gb = mb / 1024;
  return gb.toFixed(1) + " GB";
}

export function LsToolResult({ result }: { result: any }) {
  if (result.error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded-md border border-red-200 dark:border-red-800">
        <p className="text-red-700 dark:text-red-300 text-sm">
          Error: {result.error.message || JSON.stringify(result.error)}
        </p>
      </div>
    );
  }

  const files: FileEntry[] = Array.isArray(result)
    ? result.map((item) => ({
        name: item.name,
        type: item.type || (item.isDirectory ? "directory" : "file"),
        size: item.size,
        modified: item.modified,
      }))
    : [];

  return <FilesystemListing files={files} />;
}

export function ToolResult({ toolName, result }: { toolName: string; result: any }) {
  // Based on the tool name, render the appropriate component
  switch (toolName) {
    case "ls":
      return <LsToolResult result={result} />;
    default:
      // Fallback for other tools or unknown tools
      return (
        <pre className="text-xs bg-gray-100 dark:bg-gray-800 p-2.5 rounded-lg overflow-auto max-h-60">
          {JSON.stringify(result, null, 2)}
        </pre>
      );
  }
}