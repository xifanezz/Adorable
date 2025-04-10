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
      <div className="flex-1 overflow-y-auto p-3 flex flex-col space-y-6">
        {messages.map((message) => (
          <div
            key={message.id}
            className="flex flex-col"
          >
            <p className="text-xs font-medium text-gray-500 mb-1">
              {message.role === "user" ? "You" : "AI"}
            </p>
            <div className="text-sm prose prose-gray max-w-none">
              {message.content ? (
                <p className="whitespace-pre-wrap">{message.content}</p>
              ) : (
                Array.isArray(message.parts) ? 
                  message.parts.map((part, index) => {
                    const content = typeof part === 'string' 
                      ? part 
                      : part.text || JSON.stringify(part);
                    
                    return (
                      <div key={index} className="mb-2 whitespace-pre-wrap">
                        {content}
                      </div>
                    );
                  })
                : message.parts || "No content"
              )}
            </div>
          </div>
        ))}
        {messages.length === 0 && (
          <div className="text-center text-gray-400 mt-16">
            <p className="mb-2">Send a message to start a conversation</p>
            <p className="text-xs">All messages will be displayed on the left side</p>
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
