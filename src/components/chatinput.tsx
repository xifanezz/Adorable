"use client";

import {
  PromptInput,
  // PromptInputAction,
  // PromptInputActions,
  PromptInputTextarea,
} from "@/components/ui/prompt-input";
import { Button } from "@/components/ui/button";
import { ArrowUp, Square } from "lucide-react";
import { useState, useEffect, ChangeEvent } from "react";

interface PromptInputBasicProps {
  onSubmit?: (
    e?: React.FormEvent<HTMLFormElement> | any
  ) => void;
  isGenerating?: boolean;
  input?: string;
  onValueChange?: (value: string) => void;
}

export function PromptInputBasic({
  onSubmit: handleSubmit,
  isGenerating = false,
  input = "",
  onValueChange,
}: PromptInputBasicProps) {
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setIsLoading(isGenerating);
  }, [isGenerating]);

  return (
    <div className="relative w-full">
      <PromptInput
        value={input}
        onValueChange={(value) => onValueChange?.(value)}
        isLoading={isLoading}
        onSubmit={() => handleSubmit?.()}
        className="w-full border border-gray-300 shadow-sm rounded-lg"
      >
        <PromptInputTextarea
          placeholder="Type your message here..."
          className="pr-10"
        />
      </PromptInput>
      <div className="absolute right-3 bottom-3">
        <Button
          variant={isLoading ? "destructive" : "default"}
          size="icon"
          className="h-8 w-8 rounded-full"
          onClick={() => handleSubmit?.()}
        >
          {isLoading ? (
            <Square className="h-4 w-4" />
          ) : (
            <ArrowUp className="h-4 w-4" />
          )}
        </Button>
      </div>
    </div>
  );
}
