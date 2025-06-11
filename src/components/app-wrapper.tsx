"use client";

import React, { useEffect, useState } from "react";
import Chat from "./chat";
import Preview from "./preview";
import { Message } from "ai";
import { createContext } from "react";
import { useContext } from "react";
import { TopBar } from "./topbar";
import { Button } from "./ui/button";
import { MessageCircle, Monitor } from "lucide-react";

export const RepoContext = createContext<string | undefined>(undefined);

export function useCurrentRepo() {
  const context = useContext(RepoContext);
  if (context === undefined) {
    throw new Error("useCurrentRepo must be used within a RepoProvider");
  }
  return context;
}

export default function AppWrapper({
  appName,
  repo,
  initialMessages,
  appId,
  repoId,
  baseId,
  codeServerUrl,
  domain,
}: {
  appName: string;
  repo: string;
  appId: string;
  respond?: boolean;
  initialMessages: Message[];
  repoId: string;
  baseId: string;
  codeServerUrl: string;
  domain?: string;
}) {
  const [activeView, setActiveView] = useState<"web" | "files">("web");
  const [mobileActiveTab, setMobileActiveTab] = useState<"chat" | "preview">("chat");

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "auto"; // or 'visible'
    };
  }, []);

  return (
    <RepoContext.Provider value={repoId}>
      <div className="h-screen flex flex-col">
        {/* Desktop two-column layout */}
        <div className="hidden md:grid md:grid-cols-[1fr_2fr] overflow-hidden flex-1">
          <div className="h-full overflow-hidden">
            <Chat
              topBar={
                <TopBar appName={appName} codeServerUrl={codeServerUrl} />
              }
              appId={appId}
              initialMessages={initialMessages}
            />
          </div>

          <div className="overflow-auto">
            <Preview
              activeView={activeView}
              repo={repo}
              baseId={baseId}
              appId={appId}
              domain={domain}
            />
          </div>
        </div>

        {/* Mobile single-column layout - both components always in DOM */}
        <div className="md:hidden flex-1 overflow-hidden flex flex-col">
          <div className={`flex-1 flex flex-col overflow-hidden ${mobileActiveTab === "chat" ? "flex" : "hidden"}`}>
            <Chat
              topBar={
                <TopBar appName={appName} codeServerUrl={codeServerUrl} />
              }
              appId={appId}
              initialMessages={initialMessages}
            />
          </div>
          <div className={`flex-1 overflow-auto ${mobileActiveTab === "preview" ? "block" : "hidden"}`}>
            <Preview
              activeView={activeView}
              repo={repo}
              baseId={baseId}
              appId={appId}
              domain={domain}
            />
          </div>
        </div>

        {/* Mobile tab navigation - traditional bottom tab bar */}
        <div className="md:hidden flex border-t bg-background/95 backdrop-blur-sm safe-area-inset-bottom">
          <button
            onClick={() => setMobileActiveTab("chat")}
            className={`flex-1 flex flex-col items-center justify-center py-2 px-1 transition-colors ${
              mobileActiveTab === "chat"
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <MessageCircle className={`h-6 w-6 mb-1 ${mobileActiveTab === "chat" ? "fill-current" : ""}`} />
            <span className="text-xs font-medium">Chat</span>
          </button>
          <button
            onClick={() => setMobileActiveTab("preview")}
            className={`flex-1 flex flex-col items-center justify-center py-2 px-1 transition-colors ${
              mobileActiveTab === "preview"
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Monitor className={`h-6 w-6 mb-1 ${mobileActiveTab === "preview" ? "fill-current" : ""}`} />
            <span className="text-xs font-medium">Preview</span>
          </button>
        </div>
      </div>
    </RepoContext.Provider>
  );
}
