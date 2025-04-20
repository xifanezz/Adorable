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
import { ApplyPatchSchema } from "@/lib/tools";
import { ReviewDecision } from "@/agent";
import { CatSchema, GrepSchema, LsSchema } from "@/lib/tools";
import { ToolRenderer } from "./ToolRenderer";
import { useRouter } from "next/navigation";

interface PatchApprovalDialogProps {
  patch: string;
  onDecision: (decision: ReviewDecision, message?: string) => void;
}

// Simple approval dialog for patches
function PatchApprovalDialog({ patch, onDecision }: PatchApprovalDialogProps) {
  const [customMessage, setCustomMessage] = useState("");

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-900 rounded-lg p-6 max-w-3xl max-h-[80vh] overflow-y-auto">
        <h2 className="text-xl font-semibold mb-4">Approve Code Changes?</h2>
        <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded overflow-auto mb-4 max-h-[50vh]">
          <pre className="whitespace-pre-wrap text-sm">{patch}</pre>
        </div>
        <div className="mb-4">
          <input
            type="text"
            placeholder="Optional feedback message"
            className="w-full p-2 border rounded dark:bg-gray-800 dark:border-gray-700"
            value={customMessage}
            onChange={(e) => setCustomMessage(e.target.value)}
          />
        </div>
        <div className="flex justify-end gap-3">
          <button
            className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
            onClick={() => onDecision(ReviewDecision.NO_EXIT, customMessage)}
          >
            Reject & Stop
          </button>
          <button
            className="px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600"
            onClick={() =>
              onDecision(ReviewDecision.NO_CONTINUE, customMessage)
            }
          >
            Reject & Continue
          </button>
          <button
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
            onClick={() => onDecision(ReviewDecision.YES, customMessage)}
          >
            Approve
          </button>
          <button
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            onClick={() => onDecision(ReviewDecision.ALWAYS, customMessage)}
          >
            Always Approve
          </button>
        </div>
      </div>
    </div>
  );
}

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
  const [enabled, setEnabled] = useState(true);
  const [showPatchDialog, setShowPatchDialog] = useState(false);
  const [currentPatch, setCurrentPatch] = useState("");
  const [pendingToolCall, setPendingToolCall] = useState<any>(null);
  const hasResponded = useRef(false);
  // Get filesystem store state for git operations
  const filesystemStore = useFilesystemStore();
  const lastCommitInfo = filesystemStore.lastCommitInfo;
  const lastPushInfo = filesystemStore.lastPushInfo;

  const router = useRouter();
  const {
    messages,
    handleSubmit,
    input,
    handleInputChange,
    status,
    addToolResult,
    reload,
  } = useChat({
    initialMessages: props.initialMessages,
    generateId: () => {
      return "cs-" + crypto.randomUUID();
    },
    sendExtraMessageFields: true,
    onToolCall: async (tool) => {
      console.log("Tool called", tool);

      if (tool.toolCall.toolName === "ls") {
        setEnabled(false);
        try {
          const res = await filesystemStore
            .ls(tool.toolCall.args as LsSchema)
            .catch((e) => {
              console.error("Error calling ls tool", e);
              return {
                error: e.message || String(e),
              };
            });

          addToolResult({
            toolCallId: tool.toolCall.toolCallId,
            result: res,
          });

          return res;
        } finally {
          setEnabled(true);
        }
      }

      if (tool.toolCall.toolName === "applyPatch") {
        setEnabled(false);
        try {
          const { patch } = tool.toolCall.args as ApplyPatchSchema;

          // Save current patch and tool call for the approval dialog
          setCurrentPatch(patch);
          setPendingToolCall(tool);
          setShowPatchDialog(true);

          // The actual result will be handled when the user makes a decision
          // Return a promise that will be resolved later
          return new Promise((resolve) => {
            // Store the resolve function in the pendingToolCall
            setPendingToolCall({
              ...tool,
              resolve,
            });
          });
        } catch (error) {
          setEnabled(true);
          console.error("Error with applyPatch", error);

          const errorMessage =
            error instanceof Error ? error.message : String(error);

          addToolResult({
            toolCallId: tool.toolCall.toolCallId,
            result: `Error: ${errorMessage}`,
          });

          return `Error: ${errorMessage}`;
        }
      }
      if (tool.toolCall.toolName === "cat") {
        setEnabled(false);
        let res;
        try {
          // Use the cat method directly from the filesystem store
          const fileContent = await filesystemStore.cat(
            tool.toolCall.args as CatSchema
          );
          // For chat display, we only need the content as a string
          res =
            fileContent && typeof fileContent.content === "string"
              ? fileContent.content
              : "File content not available";
        } catch (e) {
          res = {
            error: e instanceof Error ? e.message : String(e),
          };
        }

        addToolResult({
          toolCallId: tool.toolCall.toolCallId,
          result: res,
        });

        setEnabled(true);
      }
      if (tool.toolCall.toolName === "grep") {
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

        addToolResult({
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

  // Handle patch approval decision
  const handlePatchDecision = async (
    decision: ReviewDecision,
    message?: string
  ) => {
    if (!pendingToolCall) return;

    setShowPatchDialog(false);

    try {
      let result: string;

      if (
        decision === ReviewDecision.YES ||
        decision === ReviewDecision.ALWAYS
      ) {
        // Apply the patch
        const { patch } = pendingToolCall.toolCall.args as ApplyPatchSchema;
        result = await filesystemStore
          .applyPatch(patch)
          .catch(
            (e) => `Error while applying patch: ${e.message || String(e)}`
          );
      } else {
        // Rejected
        result = `Changes rejected by user${message ? `: ${message}` : "."}`;
      }

      // Return the result to the AI
      addToolResult({
        toolCallId: pendingToolCall.toolCall.toolCallId,
        result,
      });

      // Resolve the pending promise
      if (pendingToolCall.resolve) {
        pendingToolCall.resolve(result);
      }
    } catch (error) {
      console.error("Error handling patch decision", error);

      const errorMessage =
        error instanceof Error ? error.message : String(error);

      addToolResult({
        toolCallId: pendingToolCall.toolCall.toolCallId,
        result: `Error: ${errorMessage}`,
      });

      if (pendingToolCall.resolve) {
        pendingToolCall.resolve(`Error: ${errorMessage}`);
      }
    } finally {
      setPendingToolCall(null);
      setCurrentPatch("");
      setEnabled(true);
    }
  };

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
      {showPatchDialog && (
        <PatchApprovalDialog
          patch={currentPatch}
          onDecision={handlePatchDecision}
        />
      )}

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
          disabled={!enabled}
          onValueChange={onValueChange}
          isGenerating={status === "streaming" || status === "submitted"}
        />
      </div>
    </div>
  );
}
