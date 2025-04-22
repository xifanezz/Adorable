"use client";

import WebView from "./webview";

export default function Preview(props: { repo: string; activeView: string }) {
  return (
    <div className="h-full overflow-y-auto relative">
      <WebView repo={props.repo} />
    </div>
  );
}
