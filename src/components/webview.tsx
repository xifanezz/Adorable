"use client";

import { Safari } from "./magicui/safari";
import { requestDevServer } from "./webview-actions";
import { FreestyleDevServer } from "freestyle-sandboxes/react/dev-server";

export default function WebView(props: { repo: string }) {
  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Safari mode="simple" url="Preview" className="h-full w-full">
        <FreestyleDevServer
          actions={{ requestDevServer }}
          repoUrl={props.repo}
        />
      </Safari>
    </div>
  );
}
