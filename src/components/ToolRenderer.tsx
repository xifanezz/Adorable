"use client";

import { cn } from "@/lib/utils";
import { LsRenderer } from "./tools/ls";
import { CatRenderer } from "./tools/cat";
import { GrepRenderer } from "./tools/grep";
import { ApplyPatchRenderer } from "./tools/applyPatch";
import { ToolInvocation } from "ai";

export function ToolRenderer({
  toolInvocation,
  className,
}: {
  toolInvocation: ToolInvocation;
  className?: string;
}) {
  // Use specialized renderers for specific tools
  if (toolInvocation.toolName === "ls") {
    return <LsRenderer toolInvocation={toolInvocation} className={className} />;
  } else if (toolInvocation.toolName === "cat") {
    return <CatRenderer toolInvocation={toolInvocation} className={className} />;
  } else if (toolInvocation.toolName === "grep") {
    return <GrepRenderer toolInvocation={toolInvocation} className={className} />;
  } else if (toolInvocation.toolName === "applyPatch") {
    return <ApplyPatchRenderer toolInvocation={toolInvocation} className={className} />;
  }
  
  // Generic renderer for other tools
  return (
    <div className={cn("flex flex-col", className)}>
      <div className="px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900">
        <div className="text-sm font-medium mb-1">{toolInvocation.toolName}</div>
        <pre className="text-xs bg-gray-50 dark:bg-gray-850 p-2 border border-gray-200 dark:border-gray-700 rounded overflow-auto">
          {JSON.stringify(toolInvocation.args, null, 2)}
        </pre>
      </div>
    </div>
  );
}