"use client";

import { useChat } from '@ai-sdk/react';

export default function Preview() {
  const { messages } = useChat({
    api: '/api/chat',
  });

  // Get the last assistant message
  const lastAssistantMessage = [...messages]
    .reverse()
    .find(message => message.role === 'assistant');

  return (
    <div className="h-full pt-4 overflow-y-auto p-6">
      {lastAssistantMessage ? (
        <div className="prose max-w-none">
          {lastAssistantMessage.content}
        </div>
      ) : (
        <div className="text-center text-gray-400 mt-16">
          <p>No content to preview yet</p>
          <p className="text-sm mt-2">Send a message to generate content</p>
        </div>
      )}
    </div>
  );
}