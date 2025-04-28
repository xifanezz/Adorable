// Note: No "use client" directive, so it can be used in a server component

import { HomeIcon } from "lucide-react";
import Link from "next/link";
import React from "react";

export function TopBar({
  appName,
  children,
}: {
  appName: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="h-12 sticky top-0 flex items-center px-4 border-b border-gray-200">
      <Link href={"/"}>
        <HomeIcon />
      </Link>
    </div>
  );
}
