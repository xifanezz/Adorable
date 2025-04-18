"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { ChevronDownIcon, ChevronRightIcon, FileIcon, CodeIcon } from "lucide-react";
import { ToolInvocation } from "ai";

export const ApplyPatchRenderer = (props: {
  toolInvocation: ToolInvocation;
  className?: string;
}) => {
  const { toolInvocation } = props;
  const [expanded, setExpanded] = useState(false);
  
  // Extract patch from args
  const patch = toolInvocation.args?.patch as string;
  
  // Process result data if we have it
  const hasResult = toolInvocation.state === "result";
  const result = hasResult ? toolInvocation.result : null;
  const hasError = result && typeof result === "object" && "error" in result;
  
  return (
    <div className={cn("flex flex-col", props.className)}>
      <div className="p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 overflow-hidden">
        <div
          className="flex items-center justify-between cursor-pointer"
          onClick={() => setExpanded(!expanded)}
        >
          <div className="flex items-center gap-2">
            <CodeIcon className="h-4 w-4 text-blue-500" />
            <div className="text-sm font-medium">Updating code</div>
          </div>
          
          <div className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
            {expanded ? (
              <ChevronDownIcon className="h-4 w-4" />
            ) : (
              <ChevronRightIcon className="h-4 w-4" />
            )}
          </div>
        </div>

        {/* When there's no result yet */}
        {!hasResult && !expanded && (
          <div className="mt-2 text-sm text-gray-500 dark:text-gray-400 italic">
            Applying code changes...
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
        
        {/* Show patch content if expanded */}
        {expanded && (
          <div className="mt-2 bg-gray-50 dark:bg-gray-800 p-2 rounded border border-gray-200 dark:border-gray-700 max-h-96 overflow-y-auto">
            <pre className="text-xs whitespace-pre-wrap">{patch}</pre>
          </div>
        )}
        
        {/* Show result if available and expanded */}
        {hasResult && !hasError && expanded && (
          <div className="mt-2 text-sm text-gray-700 dark:text-gray-300">
            {typeof result === "string" 
              ? result 
              : typeof result === "object" 
                ? JSON.stringify(result, null, 2)
                : "Changes applied"}
          </div>
        )}
      </div>
    </div>
  );
};