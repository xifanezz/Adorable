"use client";

import { createApp } from "@/actions/create-app";
import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  PromptInput,
  PromptInputTextarea,
  PromptInputActions,
} from "@/components/ui/prompt-input";
import Image from "next/image";
import LogoSvg from "@/logo.svg";

export default function Home() {
  const [prompt, setPrompt] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async () => {
    if (!prompt.trim()) return;

    setIsLoading(true);
    try {
      const app = await createApp();
      router.push(`/app/${app.id}`);
    } catch (error) {
      console.error("Error creating app:", error);
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-white flex flex-col items-center justify-center p-4 ">
      <div className="flex  flex-[1]" />
      <div className="w-full max-w-lg mx-auto flex flex-col items-center">
        {/* Logo */}
        <div className="w-32 h-32 mb-2">
          <Image src={LogoSvg} alt="Adorable Logo" width={128} height={128} />
        </div>

        {/* Title */}
        <h1 className="text-6xl md:text-7xl font-bold text-center mb-4">
          Adorable
        </h1>

        {/* Subtitle */}
        <p className="text-xl md:text-2xl text-gray-600 text-center mb-6">
          Open Source AI App Builder
        </p>

        {/* Prompt Input */}
        <div className="w-full">
          <PromptInput
            isLoading={isLoading}
            value={prompt}
            onValueChange={setPrompt}
            onSubmit={handleSubmit}
            className="mb-4"
          >
            <PromptInputTextarea
              placeholder="Describe the app you want to build..."
              className="min-h-[100px]"
            />
            <PromptInputActions className="justify-end">
              <button
                onClick={handleSubmit}
                disabled={isLoading || !prompt.trim()}
                className="px-4 py-2 bg-black text-white rounded-md font-medium hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                {isLoading ? (
                  <>
                    <svg
                      className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    Building...
                  </>
                ) : (
                  "Create App"
                )}
              </button>
            </PromptInputActions>
          </PromptInput>
        </div>
      </div>
      <div className="flex   flex-[3]" />
    </main>
  );
}
