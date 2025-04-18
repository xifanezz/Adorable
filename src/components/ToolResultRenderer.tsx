"use client";

import { cn } from "@/lib/utils";
import { Message } from "ai";
import { LsRenderer } from "./tools/ls";
import { CatRenderer } from "./tools/cat";

export function ToolResultRenderer({
  message,
  className,
}: {
  message: Message;
  className?: string;
}) {
  // Only process messages with role "tool"
  if (message.role !== "tool" || !message.toolCallId) {
    return null;
  }
  
  // Parse content if it exists
  let result = null;
  if (message.content) {
    try {
      result = JSON.parse(message.content);
    } catch (e) {
      // If it's not valid JSON, use the content directly
      result = message.content;
    }
  }
  
  // Use specialized renderers for specific tools
  if (message.name === "ls") {
    return (
      <LsRenderer
        toolInvocation={{
          toolCallId: message.toolCallId,
          toolName: "ls",
          args: {},
          state: "result",
          result: result
        }}
        className={className}
      />
    );
  } else if (message.name === "cat") {
    return (
      <CatRenderer
        toolInvocation={{
          toolCallId: message.toolCallId,
          toolName: "cat",
          args: {},
          state: "result",
          result: result
        }}
        className={className}
      />
    );
  }
  
  // Generic renderer for other tools
  return (
    <div className={cn("flex flex-col", className)}>
      <div className="px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900">
        <div className="text-sm font-medium mb-1">{message.name || "Tool Result"}</div>
        <pre className="text-xs bg-gray-50 dark:bg-gray-850 p-2 border border-gray-200 dark:border-gray-700 rounded overflow-auto">
          {JSON.stringify(result, null, 2)}
        </pre>
      </div>
    </div>
  );
}