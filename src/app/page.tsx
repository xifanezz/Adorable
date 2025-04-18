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
import { GlowEffect } from "@/components/ui/glow-effect";
import { useEffect, useState as useReactState } from "react";
import { Button } from "@/components/ui/button";
import { ArrowUp, Square } from "lucide-react";

export default function Home() {
  const [prompt, setPrompt] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isMounted, setIsMounted] = useReactState(false);
  const router = useRouter();

  // Ensure hydration is complete before showing the glow effect
  useEffect(() => {
    setIsMounted(true);
  }, []);

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
    <main className="min-h-screen bg-white flex flex-col items-center justify-center p-4 relative">
      <div className="flex flex-[1]" />
      <div className="w-full max-w-lg px-4 sm:px-0 mx-auto flex flex-col items-center">
        {/* Logo */}
        <div className="w-32 h-32 mb-2">
          <Image src={LogoSvg} alt="Adorable Logo" width={128} height={128} />
        </div>

        {/* Title */}
        <h1 className="text-5xl sm:text-6xl md:text-7xl font-bold text-center mb-4">
          Adorable
        </h1>

        {/* Subtitle */}
        <p className="text-lg sm:text-xl md:text-2xl text-gray-600 text-center mb-6">
          Open Source AI App Builder
        </p>

        {/* Prompt Input */}
        <div className="w-full relative my-5">
          {isMounted && (
            <div className="absolute inset-0 -top-2 -bottom-2 -left-0 -right-0 sm:-left-2 sm:-right-2">
              <GlowEffect
                blur="medium"
                scale={1}
                mode="breathe"
                colors={["#03001e", "#7303c0", "#ec38bc", "#fdeff9"]}
                duration={7}
              />
            </div>
          )}
          {/* Adaptable width container */}
          <div className="relative w-full max-w-full overflow-hidden">
            {/* Custom input wrapper with adaptive width */}
            <div className="w-full bg-white/90 shadow-lg rounded-md relative z-10 border transition-colors focus:border-gray-400">
              <PromptInput
                isLoading={isLoading}
                value={prompt}
                onValueChange={setPrompt}
                onSubmit={handleSubmit}
                className="relative z-10 border-none bg-transparent shadow-none"
              >
                <PromptInputTextarea
                  placeholder="Describe the app you want to build..."
                  className="min-h-[100px] w-full bg-transparent backdrop-blur-sm pr-12 "
                />
                <PromptInputActions className="justify-end">
                  {/* No visible content here */}
                </PromptInputActions>
              </PromptInput>

              {/* Absolutely positioned submit button */}
              <div className="absolute right-3 bottom-3 z-20">
                <Button
                  variant={isLoading ? "destructive" : "default"}
                  size="icon"
                  className="h-8 w-8 rounded-full shadow-md"
                  onClick={handleSubmit}
                  disabled={isLoading || !prompt.trim()}
                >
                  {isLoading ? (
                    <Square className="h-4 w-4" />
                  ) : (
                    <ArrowUp className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Example pills - moved outside the div with glow */}
        <div className="mt-6">
          <p className="text-center text-xs text-gray-500 mb-2">Examples</p>
          <div className="flex flex-wrap justify-center gap-2">
            <button
              onClick={() =>
                setPrompt(
                  "Build a dog food marketplace where users can browse and purchase premium dog food."
                )
              }
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-full hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-300"
            >
              Dog Food Marketplace
            </button>
            <button
              onClick={() =>
                setPrompt(
                  "Create a personal website with portfolio, blog, and contact sections."
                )
              }
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-full hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-300"
            >
              Personal Website
            </button>
            <button
              onClick={() =>
                setPrompt(
                  "Build a B2B SaaS for burrito shops to manage inventory, orders, and delivery logistics."
                )
              }
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-full hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-300"
            >
              Burrito B2B SaaS
            </button>
          </div>
        </div>
      </div>
      <div className="flex flex-[3]" />

      {/* Built on Freestyle pill */}
      <a
        href="https://style.dev"
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-4 right-4 px-3 py-1.5 text-xs sm:text-sm font-medium border border-gray-300 rounded-full bg-white/80 backdrop-blur-sm hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-300 flex items-center gap-1 shadow-sm"
      >
        Built on Freestyle
      </a>
    </main>
  );
}
