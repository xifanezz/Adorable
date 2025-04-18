"use client";

import { LsRenderer } from "./tools/ls";
import { ToolInvocation } from "ai";

export function ToolRenderer({
  toolInvocation,
}: {
  toolInvocation: ToolInvocation;
}) {
  if (toolInvocation.toolName === "ls") {
    return <LsRenderer toolInvocation={toolInvocation} />;
  }
}
