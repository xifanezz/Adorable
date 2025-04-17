"use client";

import { useChat } from "@ai-sdk/react";
import { useState } from "react";
import FileSystem from "./filesystem";
import WebView from "./webview";

export default function Preview(props: { repo: string }) {
  useChat({
    api: "/api/chat",
  });
  const [activeView, setActiveView] = useState<"web" | "files">("web");

  const handleDeploy = () => {
    // Deploy function to be implemented
    console.log("Deploy clicked");
  };

  const renderHeader = () => {
    return (
      <div className="mb-4 flex justify-between items-center">
        <div className="inline-flex rounded-lg bg-gray-200 dark:bg-gray-800 p-0.5 relative">
          <button
            onClick={() => setActiveView("web")}
            className={`px-4 py-1.5 text-sm z-10 relative transition-colors ${
              activeView === "web"
                ? "text-gray-800 dark:text-white font-medium"
                : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
            }`}
          >
            Web
          </button>
          <button
            onClick={() => setActiveView("files")}
            className={`px-4 py-1.5 text-sm z-10 relative transition-colors ${
              activeView === "files"
                ? "text-gray-800 dark:text-white font-medium"
                : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
            }`}
          >
            Files
          </button>
          <div 
            className="absolute top-0.5 bottom-0.5 rounded-md bg-white dark:bg-gray-700 shadow-sm"
            style={{ 
              left: activeView === "web" ? "0.125rem" : "calc(50% + 0.125rem)", 
              right: activeView === "files" ? "0.125rem" : "auto",
              width: "calc(50% - 0.25rem)",
              transition: "left 0.2s ease-in-out, right 0.2s ease-in-out"
            }}
          />
        </div>
        
        <button
          onClick={handleDeploy}
          className="px-4 py-1.5 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
        >
          Deploy
        </button>
      </div>
    );
  };

  return (
    <div className="h-full p-4 relative flex flex-col">
      {renderHeader()}

      <div className="grid grid-cols-1 grid-rows-1 w-full flex-1 overflow-hidden">
        <div 
          className="col-start-1 row-start-1 h-full overflow-hidden" 
          style={{ 
            visibility: activeView === "web" ? "visible" : "hidden",
            display: activeView === "web" ? "block" : "none" 
          }}
        >
          <WebView repo={props.repo} />
        </div>
        <div 
          className="col-start-1 row-start-1 h-full overflow-hidden" 
          style={{ 
            visibility: activeView === "files" ? "visible" : "hidden",
            display: activeView === "files" ? "block" : "none" 
          }}
        >
          <FileSystem />
        </div>
      </div>
    </div>
  );
}
