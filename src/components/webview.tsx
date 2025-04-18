"use client";

import { FreestyleDevServer } from "@/freestyle-sdk/repo-preview";
import { Safari } from "./magicui/safari";

export default function WebView(props: { repo: string }) {
  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Safari mode="simple" url="Preview" className="h-full w-full">
        <FreestyleDevServer repo={props.repo} />
      </Safari>
    </div>
  );
}
