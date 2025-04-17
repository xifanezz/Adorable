"use client";

import { useChat } from "@ai-sdk/react";
import { PromptInputBasic } from "./chatinput";
import { Markdown } from "./ui/markdown";
import { ChangeEvent } from "react";
import Image from "next/image";
import LogoSvg from "@/public/logo.svg";
import { cn } from "@/lib/utils";

export default function Chat() {
  const { messages, handleSubmit, input, handleInputChange, status } = useChat({
    api: "/api/chat",
  });

  // Create a wrapper for handleInputChange to match expected function signature
  const onValueChange = (value: string) => {
    handleInputChange({
      target: { value },
    } as ChangeEvent<HTMLTextAreaElement>);
  };

  // Create a submission handler
  const onSubmit = (e?: Event) => {
    if (e?.preventDefault) {
      e.preventDefault();
    }
    handleSubmit(e);
  };

  return (
    <div className="h-screen max-h-screen flex flex-col">
      <div className="flex-1 overflow-y-auto p-3 flex flex-col space-y-6">
        {messages.map((message) => (
          <div key={message.id}>
            <div
              className={cn(
                "flex flex-row items-center gap-2",
                message.role === "user" ? "justify-end" : "justify-start",
              )}
            >
              {message.role === "user" ? null : (
                <Image className="h-8 w-8" src={LogoSvg} alt="Logo" />
              )}
              <p className="text-xs font-medium text-gray-500">
                {message.role === "user" ? "You" : "Styley"}
              </p>
            </div>
            <div
              className={cn(
                "flex flex-col gap-1 pt-2",
                message.role === "user"
                  ? ""
                  : "rounded-tr-lg rounded-bl-lg rounded-br-lg bg-muted border border-border",
              )}
            >
              <div
                className={cn(
                  "prose-container",
                  message.role === "user" ? "ml-auto " : "mr-auto px-2.5",
                )}
              >
                {Array.isArray(message.parts) ? (
                  message.parts.map((part, index) => {
                    if (part.type === "text") {
                      return (
                        <div key={index} className="mb-4">
                          <Markdown className="prose prose-sm dark:prose-invert max-w-none">
                            {part.text}
                          </Markdown>
                        </div>
                      );
                    } else if (part.type && part.type !== "step-start") {
                      return (
                        <div
                          key={index}
                          className="mb-2 text-xs bg-gray-100 dark:bg-gray-800 p-2.5 rounded-lg"
                        >
                          {JSON.stringify(part)}
                        </div>
                      );
                    }
                    return null;
                  })
                ) : message.content ? (
                  <Markdown className="prose prose-sm dark:prose-invert max-w-none">
                    {message.content}
                  </Markdown>
                ) : (
                  <p className="text-gray-500">No content</p>
                )}
              </div>
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
      <div className="p-3 sticky bottom-0 transition-all bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm z-10">
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
