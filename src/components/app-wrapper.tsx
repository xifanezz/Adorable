"use client";

import React, { useState } from "react";
import { TopBar } from "./topbar";
import PreviewControls from "./preview-controls";
import Chat from "./chat";
import Preview from "./preview";
import { Message } from "ai";
import { createContext } from "react";
import { useContext } from "react";

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
}: {
  appName: string;
  repo: string;
  appId: string;
  initialMessages: Message[];
  repoId: string;
}) {
  const [activeView, setActiveView] = useState<"web" | "files">("web");

  return (
    <RepoContext.Provider value={repoId}>
      <div className="h-screen grid grid-rows-[48px_1fr] grid-cols-1">
        <TopBar appName={appName}>
          <PreviewControls onModeChange={setActiveView} />
        </TopBar>
        <div className="grid grid-cols-[1fr_2fr] overflow-hidden">
          <div className="border-r overflow-auto">
            <Chat appId={appId} initialMessages={initialMessages} />
          </div>
          <div className="overflow-auto">
            <Preview activeView={activeView} repo={repo} />
          </div>
        </div>
      </div>
    </RepoContext.Provider>
  );
}
