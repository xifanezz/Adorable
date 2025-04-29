"use client";

import { requestDevServer as requestDevServerInner } from "./webview-actions";
import { FreestyleDevServer } from "freestyle-sandboxes/react/dev-server";

export default function WebView(props: { repo: string; baseId: string }) {
  function requestDevServer({ repoId }: { repoId: string }) {
    return requestDevServerInner({ repoId, baseId: props.baseId });
  }

  return (
    <div className="flex flex-col h-full overflow-hidden safari:rounded-tl-lg border-l">
      <FreestyleDevServer
        actions={{ requestDevServer }}
        repoId={props.repo}
        loadingComponent={() => <></>}
      />
    </div>
  );
}
