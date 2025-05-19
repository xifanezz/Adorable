"use client";

import React, { useState } from "react";
import Chat from "./chat";
import Preview from "./preview";
import { Message } from "ai";
import { createContext } from "react";
import { useContext } from "react";
import { TopBar } from "./topbar";

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
  domain: string;
}) {
  const [activeView, setActiveView] = useState<"web" | "files">("web");

  return (
    <RepoContext.Provider value={repoId}>
      <div className="h-screen grid grid-cols-1">
        <div className="grid grid-cols-[1fr_2fr] overflow-hidden">
          <div className="h-screen overflow-hidden">
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
      </div>
    </RepoContext.Provider>
  );
}
