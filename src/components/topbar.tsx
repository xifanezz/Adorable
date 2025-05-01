// Note: No "use client" directive, so it can be used in a server component

import { ArrowUpRightIcon, HomeIcon } from "lucide-react";
import Link from "next/link";
import React from "react";
import { Button } from "./ui/button";

export function TopBar({
  appName,
  children,
  codeServerUrl,
}: {
  appName: string;
  children?: React.ReactNode;
  codeServerUrl: string;
}) {
  return (
    <div className="h-12 sticky top-0 flex items-center px-4 border-b border-gray-200 bg-background justify-between">
      <Link href={"/"}>
        <HomeIcon />
      </Link>
      <a target="_blank" href={codeServerUrl}>
        <Button size="sm" variant={"outline"}>
          {/* <img src="/vscode-logo.svg" className="h-4 w-4" /> */}
          VS Code
          <ArrowUpRightIcon />
        </Button>
      </a>
    </div>
  );
}
