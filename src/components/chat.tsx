"use client";

import { useChat } from "@ai-sdk/react";
import { PromptInputBasic } from "./chatinput";
import { Markdown } from "./ui/markdown";
import { ChangeEvent, useEffect, useRef, useState } from "react";
import Image from "next/image";
import LogoSvg from "@/logo.svg";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "motion/react";
import { ChatContainer } from "./ui/chat-container";
import { Message } from "ai";
import { useFilesystemStore } from "@/lib/filesystem-store";
import { ToolRenderer } from "./ToolRenderer";
import { useRouter } from "next/navigation";

// Display commit and push notifications
function GitStatusNotification({
  lastCommitInfo,
  lastPushInfo,
}: {
  lastCommitInfo: {
    hash: string;
    message: string;
    timestamp: Date;
  } | null;
  lastPushInfo: {
    success: boolean;
    timestamp: Date;
    error?: string;
  } | null;
}) {
  const [showCommit, setShowCommit] = useState(!!lastCommitInfo);
  const [showPush, setShowPush] = useState(!!lastPushInfo);

  // Auto-hide notifications after 5 seconds
  useEffect(() => {
    if (lastCommitInfo) {
      setShowCommit(true);
      const timer = setTimeout(() => setShowCommit(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [lastCommitInfo]);

  useEffect(() => {
    if (lastPushInfo) {
      setShowPush(true);
      const timer = setTimeout(() => setShowPush(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [lastPushInfo]);

  if (!showCommit && !showPush) return null;

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2">
      {showCommit && lastCommitInfo && (
        <div className="bg-gray-800 text-white p-3 rounded shadow-lg max-w-md">
          <div className="flex justify-between items-center mb-1">
            <span className="font-medium">Commit Created</span>
            <button
              className="text-gray-400 hover:text-white"
              onClick={() => setShowCommit(false)}
            >
              ×
            </button>
          </div>
          <div className="text-sm text-gray-300">{lastCommitInfo.message}</div>
          <div className="text-xs text-gray-400 mt-1">
            {lastCommitInfo.hash.substring(0, 7)} •{" "}
            {lastCommitInfo.timestamp.toLocaleTimeString()}
          </div>
        </div>
      )}

      {showPush && lastPushInfo && (
        <div
          className={`p-3 rounded shadow-lg max-w-md ${
            lastPushInfo.success ? "bg-green-600" : "bg-red-600"
          } text-white`}
        >
          <div className="flex justify-between items-center mb-1">
            <span className="font-medium">
              {lastPushInfo.success ? "Push Successful" : "Push Failed"}
            </span>
            <button
              className="text-gray-200 hover:text-white"
              onClick={() => setShowPush(false)}
            >
              ×
            </button>
          </div>
          {!lastPushInfo.success && lastPushInfo.error && (
            <div className="text-sm">{lastPushInfo.error}</div>
          )}
          <div className="text-xs text-gray-200 mt-1">
            {lastPushInfo.timestamp.toLocaleTimeString()}
          </div>
        </div>
      )}
    </div>
  );
}

export default function Chat(props: {
  appId: string;
  initialMessages: Message[];
  respond?: boolean;
}) {
  const hasResponded = useRef(false);
  // Get filesystem store state for git operations
  const filesystemStore = useFilesystemStore();
  const lastCommitInfo = filesystemStore.lastCommitInfo;
  const lastPushInfo = filesystemStore.lastPushInfo;

  const router = useRouter();
  const { messages, handleSubmit, input, handleInputChange, status, reload } =
    useChat({
      initialMessages: props.initialMessages,
      generateId: () => {
        return "cs-" + crypto.randomUUID();
      },
      sendExtraMessageFields: true,
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
    if (e?.preventDefault) {
      e.preventDefault();
    }
    console.log("EVT", e);
    console.log(JSON.stringify(e), e?.target);
    handleSubmit(e);
  };
  // Use a ref to track if we've already sent the initial message

  // Send initial message if provided and no messages are present
  useEffect(() => {
    if (
      props.respond &&
      messages.at(-1)?.role === "user" &&
      !hasResponded.current
    ) {
      hasResponded.current = true;
      console.log("Sending initial message");
      handleSubmit();
      reload();
      router.push(`/app/${props.appId}`, {});
      // router.push(`/app/${props.appId}}`, {});
    } else {
      console.log(
        "Not sending initial message",
        messages.at(-1),
        props.respond
      );
    }
  });

  return (
    <div className="flex flex-col h-full">
      <GitStatusNotification
        lastCommitInfo={lastCommitInfo}
        lastPushInfo={lastPushInfo}
      />

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
                        {index === messages.length - 1 &&
                          message.role === "assistant" && (
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
                          {message.role === "system" ? "System" : "Styley"}
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
                              className="mb-4"
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
          onValueChange={onValueChange}
          isGenerating={status === "streaming" || status === "submitted"}
        />
      </div>
    </div>
  );
}
