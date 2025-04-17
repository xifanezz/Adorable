"use client";

import React, { useState } from "react";
import { TopBar } from "./topbar";
import PreviewControls from "./preview-controls";
import Chat from "./chat";
import Preview from "./preview";

export default function AppWrapper({
  appName,
  repo,
}: {
  appName: string;
  repo: string;
}) {
  const [activeView, setActiveView] = useState<"web" | "files">("web");

  return (
    <div className="h-screen grid grid-rows-[48px_1fr] grid-cols-1">
      <TopBar appName={appName}>
        <PreviewControls onModeChange={setActiveView} />
        {repo}
      </TopBar>
      <div className="grid grid-cols-[1fr_2fr] overflow-hidden">
        <div className="border-r overflow-auto">
          <Chat />
        </div>
        <div className="overflow-auto">
          <Preview activeView={activeView} repo={repo} />
        </div>
      </div>
    </div>
  );
}
