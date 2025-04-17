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

  const renderToggle = () => {
    return (
      <div className="absolute top-4 right-6 flex space-x-2 bg-gray-100 dark:bg-gray-800 p-1 rounded-md">
        <button
          onClick={() => setActiveView("files")}
          className={`px-3 py-1 text-sm rounded-md transition-colors ${
            activeView === "files"
              ? "bg-blue-600 text-white"
              : "hover:bg-gray-200 dark:hover:bg-gray-700"
          }`}
        >
          Files
        </button>
        <button
          onClick={() => setActiveView("web")}
          className={`px-3 py-1 text-sm rounded-md transition-colors ${
            activeView === "web"
              ? "bg-blue-600 text-white"
              : "hover:bg-gray-200 dark:hover:bg-gray-700"
          }`}
        >
          Web
        </button>
      </div>
    );
  };

  return (
    <div className="h-full pt-4 overflow-y-auto p-6 relative">
      {renderToggle()}

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
