"use client";

import { requestDevServer as requestDevServerInner } from "./webview-actions";
import "./loader.css";
import { FreestyleDevServer } from "freestyle-sandboxes/react/dev-server";

export default function WebView(props: { repo: string; baseId: string }) {
  function requestDevServer({ repoId }: { repoId: string }) {
    return requestDevServerInner({ repoId, baseId: props.baseId });
  }

  return (
    <div className="flex flex-col h-full overflow-hidden border-l transition-opacity duration-700">
      <FreestyleDevServer
        actions={{ requestDevServer }}
        repoId={props.repo}
        loadingComponent={({ iframeLoading }) => (
          <div className="flex items-center justify-center h-full">
            <div>
              <div className="text-center">
                {iframeLoading ? "JavaScript Loading" : "Starting VM"}
              </div>
              <div>
                <div className="loader"></div>
              </div>
            </div>
          </div>
        )}
      />
    </div>
  );
}
