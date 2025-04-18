"use client";

import { cn } from "@/lib/utils";

type ToolInvocationType = {
  name: string;
  args: any;
};

export function ToolRenderer({ 
  toolInvocation,
  className
}: { 
  toolInvocation: ToolInvocationType;
  className?: string;
}) {
  return (
    <div className={cn("rounded-lg overflow-hidden", className)}>
      <div className="px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900">
        <div className="text-sm font-medium mb-1">{toolInvocation.name}</div>
        <pre className="text-xs bg-gray-50 dark:bg-gray-850 p-2 border border-gray-200 dark:border-gray-700 rounded overflow-auto">
          {JSON.stringify(toolInvocation.args, null, 2)}
        </pre>
      </div>
    </div>
  );
}