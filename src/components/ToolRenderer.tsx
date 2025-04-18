"use client";

import { ToolInvocation } from "ai";
import { LsRenderer } from "./tools/ls";

export function ToolRenderer({
  toolInvocation,
}: {
  toolInvocation: ToolInvocation;
}) {
  if (toolInvocation.toolName == "ls") {
    return <LsRenderer toolInvocation={toolInvocation} />;
  }
  return <></>;
}
