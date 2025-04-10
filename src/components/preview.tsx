"use client";

import { useChat } from "@ai-sdk/react";
import { useState } from "react";
import { Markdown } from "./ui/markdown";
import FileSystem from "./filesystem";
import WebView from "./webview";

export default function Preview() {
  const { messages } = useChat({
    api: "/api/chat",
  });
  const [activeView, setActiveView] = useState<"files" | "web">("files");

  // Get the last assistant message
  const lastAssistantMessage = [...messages]
    .reverse()
    .find((message) => message.role === "assistant");

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

      {activeView === "files" ? <FileSystem /> : <WebView />}
    </div>
  );
}
