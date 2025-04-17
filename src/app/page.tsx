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
      const app = await createApp("Adorable App", prompt);
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
        <div className="w-full relative m-5">
          {isMounted && (
            <div className="absolute inset-0 -top-2 -bottom-2 -left-2 -right-2">
              <GlowEffect
                // blur="stronger"
                scale={1}
                mode="breathe"
                colors={["#03001e", "#7303c0", "#ec38bc", "#fdeff9"]}
                // colors={["#3357FF", "#33B6FF", "#33FFE0"]}
                duration={7}
              />
            </div>
          )}
          <div className="relative">
            <PromptInput
              isLoading={isLoading}
              value={prompt}
              onValueChange={setPrompt}
              onSubmit={handleSubmit}
              className="relative z-10 bg-white/90 shadow-lg pr-4"
            >
              <PromptInputTextarea
                placeholder="Describe the app you want to build..."
                className="min-h-[100px] bg-white/90 backdrop-blur-sm pr-10"
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
        
        {/* Example pills - moved outside the div with glow */}
        <div className="mt-6">
          <p className="text-center text-xs text-gray-500 mb-2">Examples</p>
          <div className="flex flex-wrap justify-center gap-2">
          <button 
            onClick={() => setPrompt("Build a dog food marketplace where users can browse and purchase premium dog food.")}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded-full hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-300"
          >
            Dog Food Marketplace
          </button>
          <button 
            onClick={() => setPrompt("Create a personal website with portfolio, blog, and contact sections.")}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded-full hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-300"
          >
            Personal Website
          </button>
          <button 
            onClick={() => setPrompt("Build a B2B SaaS for burrito shops to manage inventory, orders, and delivery logistics.")}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded-full hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-300"
          >
            Burrito B2B SaaS
          </button>
          </div>
        </div>
      </div>
      <div className="flex flex-[3]" />
    </main>
  );
}
