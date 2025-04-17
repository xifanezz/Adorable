// Note: No "use client" directive, so it can be used in a server component

import React from "react";

export function TopBar({ 
  appName, 
  children 
}: { 
  appName: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="h-12 grid grid-cols-[1fr_2fr] border-b bg-slate-50">
      <div className="flex items-center px-4 border-r">
        <div className="font-medium">{appName}</div>
      </div>
      <div className="px-4 flex items-center">
        {children || (
          // Default right-side content if no children provided
          <div className="h-12 flex items-center justify-end">
            <button className="px-4 py-1.5 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors">
              Deploy
            </button>
          </div>
        )}
      </div>
    </div>
  );
}