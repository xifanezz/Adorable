"use client";

import { useChat } from "@ai-sdk/react";
import { PromptInputBasic } from "./chatinput";
import { useState } from "react";

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
    <div className="h-full flex flex-col">
      <div className="flex-1 overflow-y-auto p-3 flex flex-col space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`p-2 rounded ${
              message.role === "user" ? "bg-blue-50 ml-4" : "bg-gray-50 mr-4"
            }`}
          >
            <p className="text-sm text-gray-500 mb-1">
              {message.role === "user" ? "You" : "AI"}
            </p>
            <p className="text-sm">{message.content}</p>
          </div>
        ))}
        {messages.length === 0 && (
          <div className="text-center text-gray-400 mt-8">
            Send a message to start a conversation
          </div>
        )}
      </div>
      <div className="p-3">
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
