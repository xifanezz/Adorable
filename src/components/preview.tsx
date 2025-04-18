"use client";

import FileSystem from "./filesystem";
import WebView from "./webview";

export default function Preview(props: { repo: string; activeView: string }) {
  return (
    <div className="h-full pt-4 overflow-y-auto p-4 relative">
      <div className="grid grid-cols-1 grid-rows-1 w-full h-full">
        <div
          className="col-start-1 row-start-1"
          style={{
            visibility: props.activeView === "files" ? "visible" : "hidden",
          }}
        >
          <FileSystem repoUrl={props.repo} />
        </div>
        <div
          className="col-start-1 row-start-1"
          style={{
            visibility: props.activeView === "web" ? "visible" : "hidden",
          }}
        >
          <WebView repo={props.repo} />
        </div>
      </div>
    </div>
  );
}
