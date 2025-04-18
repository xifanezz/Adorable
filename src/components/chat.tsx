"use client";

import { useChat } from "@ai-sdk/react";
import { PromptInputBasic } from "./chatinput";
import { Markdown } from "./ui/markdown";
import { ChangeEvent, useState } from "react";
import Image from "next/image";
import LogoSvg from "@/logo.svg";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "motion/react";
import { ChatContainer } from "./ui/chat-container";
import { Message } from "ai";
import { useFilesystemStore } from "@/lib/filesystem-store";
import { CatSchema, GrepSchema, LsSchema } from "@/lib/tools";
import { ToolRenderer } from "./ToolRenderer";

export default function Chat(props: {
  appId: string;
  initialMessages: Message[];
}) {
  const [enabled, setEnabled] = useState(true);
  const filesystemStore = useFilesystemStore();
  const {
    messages,
    handleSubmit,
    input,
    handleInputChange,
    status,
    addToolResult,
  } = useChat({
    initialMessages: props.initialMessages,
    generateId: () => {
      return "cs-" + crypto.randomUUID();
    },
    sendExtraMessageFields: true,
    onToolCall: async (tool) => {
      if (tool.toolCall.toolName === "ls") {
        setEnabled(false);
        const res = await filesystemStore
          .ls(tool.toolCall.args as LsSchema)
          .catch((e) => {
            return {
              error: e,
            };
          });
        await addToolResult({
          toolCallId: tool.toolCall.toolCallId,
          result: res,
        });

        setEnabled(true);
        // return res;
      } else if (tool.toolCall.toolName === "cat") {
        setEnabled(false);
        let res;
        try {
          const fileContent = await filesystemStore.getFileContent(
            (tool.toolCall.args as CatSchema).path
          );
          // For chat display, we only need the content as a string
          res =
            typeof fileContent?.content === "string"
              ? fileContent.content
              : "File content not available";
        } catch (e) {
          res = {
            error: e instanceof Error ? e.message : String(e),
          };
        }

        await addToolResult({
          toolCallId: tool.toolCall.toolCallId,
          result: res,
        });

        setEnabled(true);
      } else if (tool.toolCall.toolName === "grep") {
        setEnabled(false);
        let res;
        try {
          // Call the grep method from filesystemStore
          res = await filesystemStore
            .grep(tool.toolCall.args as GrepSchema)
            .catch((e) => {
              return {
                error: e instanceof Error ? e.message : String(e),
              };
            });
        } catch (e) {
          res = {
            error: e instanceof Error ? e.message : String(e),
          };
        }

        await addToolResult({
          toolCallId: tool.toolCall.toolCallId,
          result: res,
        });

        setEnabled(true);
      }
    },
    headers: {
      "Adorable-App-Id": props.appId,
    },
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
    if (!enabled) {
      return;
    }
    if (e?.preventDefault) {
      e.preventDefault();
    }
    handleSubmit(e);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-3 flex flex-col space-y-6">
        <ChatContainer autoScroll>
          <AnimatePresence>
            {messages.map((message, index) => (
              <motion.div
                key={message.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <div
                  className={cn(
                    "flex flex-row items-center gap-2",
                    message.role === "user" ? "justify-end" : "justify-start"
                  )}
                >
                  {message.role === "user" ? null : (
                    <div className="flex items-center h-8">
                      <AnimatePresence mode="popLayout">
                        {index === messages.length - 1 && (
                          <motion.div
                            key="logo"
                            className="z-[-1]"
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            exit={{ y: 20, opacity: 0 }}
                            transition={{
                              type: "spring",
                              stiffness: 300,
                              damping: 25,
                            }}
                          >
                            <Image
                              className="h-8 w-8 z-[-1] mr-2"
                              src={LogoSvg}
                              alt="Logo"
                            />
                          </motion.div>
                        )}
                        <motion.p
                          className={cn(
                            "text-xs font-medium text-gray-500",
                            index === messages.length - 1 ? "" : "mb-2"
                          )}
                          layout="position"
                          layoutId={`name-${message.id}`}
                          transition={{
                            type: "spring",
                            stiffness: 300,
                            damping: 25,
                          }}
                        >
                          Styley
                        </motion.p>
                      </AnimatePresence>
                    </div>
                  )}
                  {message.role === "user" && (
                    <p className="text-xs font-medium text-gray-500">You</p>
                  )}
                </div>
                <div
                  className={cn(
                    "flex flex-col gap-1 pt-2 ",
                    message.role === "user"
                      ? ""
                      : "rounded-tr-lg rounded-bl-lg rounded-br-lg bg-muted border border-border z-10 mb-4"
                  )}
                >
                  <div
                    className={cn(
                      "prose-container",
                      message.role === "user" ? "ml-auto " : "mr-auto px-2.5"
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
                        } else if (
                          part.type &&
                          part.type === "tool-invocation"
                        ) {
                          return (
                            <ToolRenderer
                              key={index}
                              toolInvocation={part.toolInvocation}
                            />
                          );
                        }
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
              </motion.div>
            ))}
            {messages.length === 0 && (
              <div className="text-center text-gray-400 mt-16">
                <p className="mb-2">Send a message to start a conversation</p>
                <p className="text-xs">
                  All messages will be displayed on the left side
                </p>
              </div>
            )}
          </AnimatePresence>
        </ChatContainer>
      </div>
      <div className="p-3 sticky bottom-0 transition-all bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm z-10">
        <PromptInputBasic
          input={input || ""}
          onSubmit={onSubmit}
          disabled={!enabled}
          onValueChange={onValueChange}
          isGenerating={status === "streaming" || status === "submitted"}
        />
      </div>
    </div>
  );
}
