"use client";

import { useChat } from "@ai-sdk/react";
import { PromptInputBasic } from "./chatinput";
import { useState } from "react";
import { Markdown } from "./ui/markdown";

export default function Chat() {
  const { messages, handleSubmit, input, handleInputChange, status } = useChat({
    api: "/api/chat",
  });

  // Create a wrapper for handleInputChange to match expected function signature
  const onValueChange = (value: string) => {
    handleInputChange({ target: { value } } as any);
  };

  // Create a submission handler
  const onSubmit = (e?: any) => {
    if (e?.preventDefault) {
      e.preventDefault();
    }
    handleSubmit(e);
  };

  return (
    <div className="h-screen max-h-screen flex flex-col">
      <div className="flex-1 overflow-y-auto p-3 flex flex-col space-y-6">
        {messages.map((message) => (
          <div key={message.id} className="flex flex-col">
            <p className="text-xs font-medium text-gray-500 mb-1">
              {message.role === "user" ? "You" : "Styley"}
            </p>
            <div className="text-sm prose prose-sm dark:prose-invert max-w-none">
              {Array.isArray(message.parts) ? (
                message.parts.map((part, index) => {
                  if (part.type === "text") {
                    return (
                      <div key={index} className="mb-2">
                        <Markdown>{part.text}</Markdown>
                      </div>
                    );
                  } else if (part.type && part.type !== "step-start") {
                    return (
                      <div key={index} className="mb-2 text-xs bg-gray-100 dark:bg-gray-800 p-2 rounded">
                        {JSON.stringify(part)}
                      </div>
                    );
                  }
                  return null;
                })
              ) : message.content ? (
                <Markdown>{message.content}</Markdown>
              ) : (
                <p className="text-gray-500">No content</p>
              )}
            </div>
          </div>
        ))}
        {messages.length === 0 && (
          <div className="text-center text-gray-400 mt-16">
            <p className="mb-2">Send a message to start a conversation</p>
            <p className="text-xs">
              All messages will be displayed on the left side
            </p>
          </div>
        )}
      </div>
      <div className="p-3 sticky bottom-0 transition-all">
        <PromptInputBasic
          input={input || ""}
          onSubmit={onSubmit}
          onValueChange={onValueChange}
          isGenerating={status === "streaming" || status === "submitted"}
        />
      </div>
    </div>
  );
}
