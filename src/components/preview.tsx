"use client";

import { useChat } from "@ai-sdk/react";
import { useState } from "react";
import FileSystem from "./filesystem";
import WebView from "./webview";

export default function Preview(props: { repo: string }) {
  useChat({
    api: "/api/chat",
  });
  const [activeView, setActiveView] = useState<"files" | "web">("files");

  const renderHeader = () => {
    return (
      <div className="mb-4 border-b pb-2">
        <div className="flex border border-gray-200 dark:border-gray-700 rounded-md text-sm overflow-hidden inline-block">
          <button
            onClick={() => setActiveView("files")}
            className={`px-3 py-1 transition-colors ${
              activeView === "files"
                ? "bg-gray-100 dark:bg-gray-800 font-medium"
                : "hover:bg-gray-50 dark:hover:bg-gray-800/50"
            }`}
          >
            Files
          </button>
          <button
            onClick={() => setActiveView("web")}
            className={`px-3 py-1 transition-colors border-l border-gray-200 dark:border-gray-700 ${
              activeView === "web"
                ? "bg-gray-100 dark:bg-gray-800 font-medium"
                : "hover:bg-gray-50 dark:hover:bg-gray-800/50"
            }`}
          >
            Web
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="h-full overflow-y-auto p-4 relative">
      {renderHeader()}

      <div className="grid grid-cols-1 grid-rows-1 w-full h-full">
        <div className="col-start-1 row-start-1" style={{ visibility: activeView === "files" ? "visible" : "hidden" }}>
          <FileSystem />
        </div>
        <div className="col-start-1 row-start-1" style={{ visibility: activeView === "web" ? "visible" : "hidden" }}>
          <WebView repo={props.repo} />
        </div>
      </div>
    </div>
  );
}
