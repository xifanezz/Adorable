"use client";

import { FreestyleDevServer } from "@/freestyle-sdk/repo-preview";

export default function WebView(props: { repo: string }) {
  return (
    <div className="h-full flex flex-col">
      <div className="flex-grow w-full">
        <FreestyleDevServer repo={props.repo} />
      </div>
    </div>
  );
}
