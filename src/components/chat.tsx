"use client";

import { useChat } from "@ai-sdk/react";
import { PromptInputBasic } from "./chatinput";
import { Markdown } from "./ui/markdown";
import { ChangeEvent, useEffect, useRef } from "react";
import { ChatContainer } from "./ui/chat-container";
import { Message } from "ai";
import { ToolMessage } from "./tools";
import { useRouter } from "next/navigation";

export default function Chat(props: {
  appId: string;
  initialMessages: Message[];
  respond?: boolean;
  isLoading?: boolean;
}) {
  const hasResponded = useRef(false);
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
      <div className="flex-1 overflow-y-auto flex flex-col space-y-6">
        <ChatContainer autoScroll>
          {messages.map((message) => (
            <MessageBody key={message.id} message={message} />
          ))}
        </ChatContainer>
      </div>
      <div className="p-3 sticky bottom-0 transition-all bg-background dark:bg-gray-900/80 backdrop-blur-sm z-10">
        <PromptInputBasic
          input={input || ""}
          onSubmit={onSubmit}
          onValueChange={onValueChange}
          isGenerating={
            props.isLoading || status === "streaming" || status === "submitted"
          }
        />
      </div>
    </div>
  );
}

function MessageBody({ message }: { message: Message }) {
  if (message.role === "user") {
    return (
      <div className="flex justify-end py-1 mb-4">
        <div className="bg-gray-200 rounded-xl px-4 py-1 max-w-[80%] ml-auto">
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

          if (part.type === "tool-invocation") {
            if (
              message.parts!.length - 1 == index &&
              part.toolInvocation.state !== "result"
            ) {
              return (
                <ToolMessage key={index} toolInvocation={part.toolInvocation} />
              );
            } else {
              return undefined;
            }
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
