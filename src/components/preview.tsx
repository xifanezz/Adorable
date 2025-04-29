"use client";

import WebView from "./webview";

export default function Preview(props: {
  repo: string;
  baseId: string;
  activeView: string;
}) {
  return (
    <div className="h-full overflow-y-auto relative">
      <WebView repo={props.repo} baseId={props.baseId} />
    </div>
  );
}
