"use client";

import { useChat } from "@ai-sdk/react";
import { PromptInputBasic } from "./chatinput";
import { Markdown } from "./ui/markdown";
import { ChangeEvent, useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { ChatContainer } from "./ui/chat-container";
import { Message } from "ai";
import { useFilesystemStore } from "@/lib/filesystem-store";
import { ToolMessage } from "./tools";
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
    console.log("Checking for initial message");
    console.log(props.respond, messages);
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

      <div className="flex-1 overflow-y-auto flex flex-col space-y-6">
        <ChatContainer autoScroll>
          {messages.map((message) => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <MessageBody message={message} />
            </motion.div>
          ))}
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

function MessageBody({ message }: { message: Message }) {
  if (message.role === "user") {
    return (
      <div className="flex justify-end py-1 mb-4">
        <div className="bg-gray-200 px-2 py-0 max-w-[80%] ml-auto">
          {message.content}
        </div>
      </div>
    );
  }

  if (Array.isArray(message.parts) && message.parts.length !== 0) {
    return (
      <div className="mb-4">
        {message.parts.map((part, index) => {
          if (part.type === "text") {
            return (
              <div key={index} className="mb-4">
                <Markdown className="prose prose-sm dark:prose-invert max-w-none">
                  {part.text}
                </Markdown>
              </div>
            );
          }

          if (part.type && part.type === "tool-invocation") {
            return (
              <ToolMessage key={index} toolInvocation={part.toolInvocation} />
            );
          }
        })}
      </div>
    );
  }

  if (message.content) {
    return (
      <Markdown className="prose prose-sm dark:prose-invert max-w-none">
        {message.content}
      </Markdown>
    );
  }

  return (
    <div>
      <p className="text-gray-500">Something went wrong</p>
    </div>
  );
}
