"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  PromptInput,
  PromptInputTextarea,
  PromptInputActions,
} from "@/components/ui/prompt-input";
import Image from "next/image";
import LogoSvg from "@/logo.svg";
import { useEffect, useState as useReactState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { ExampleButton } from "@/components/ExampleButton";
import { ArrowUp, Square } from "lucide-react";

export default function Home() {
  const [prompt, setPrompt] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isMounted, setIsMounted] = useReactState(false);
  const router = useRouter();

  // For the typing animation
  const placeholderRef = useRef<HTMLTextAreaElement>(null);
  const [placeholderText, setPlaceholderText] = useState("");
  const fullPlaceholder = "I want to build";
  const exampleIdeas = [
    "a dog food marketplace",
    "a personal portfolio website for my mother's bakery",
    "a B2B SaaS for burrito shops to sell burritos",
    "a social network for coders to find grass to touch",
    "a potato farm.🇮🇪 🇮🇪 🇮🇪            ",
  ];

  // Ensure hydration is complete before showing the glow effect
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Typing animation effect
  useEffect(() => {
    if (!isMounted) return;

    let currentTextIndex = 0;
    let currentCharIndex = 0;
    let typingTimer: NodeJS.Timeout;
    let pauseTimer: NodeJS.Timeout;

    const typeNextCharacter = () => {
      {
        // Start typing the current example idea
        const currentIdea = exampleIdeas[currentTextIndex];
        if (currentCharIndex < currentIdea.length) {
          setPlaceholderText(
            fullPlaceholder +
              " " +
              currentIdea.substring(0, currentCharIndex + 1)
          );
          currentCharIndex++;
          typingTimer = setTimeout(typeNextCharacter, 100);
        } else {
          // Pause at the end of typing the example
          pauseTimer = setTimeout(() => {
            // Begin erasing the example
            eraseText();
          }, 2000);
        }
      }
    };

    const eraseText = () => {
      const currentIdea = exampleIdeas[currentTextIndex];
      if (currentCharIndex > 0) {
        setPlaceholderText(
          fullPlaceholder + " " + currentIdea.substring(0, currentCharIndex - 1)
        );
        currentCharIndex--;
        typingTimer = setTimeout(eraseText, 50);
      } else {
        // Move to the next example
        currentTextIndex = (currentTextIndex + 1) % exampleIdeas.length;
        pauseTimer = setTimeout(() => {
          typingTimer = setTimeout(typeNextCharacter, 100);
        }, 500);
      }
    };

    // Start the typing animation
    typingTimer = setTimeout(typeNextCharacter, 500);

    return () => {
      clearTimeout(typingTimer);
      clearTimeout(pauseTimer);
    };
  }, [isMounted]);

  const handleSubmit = async () => {
    if (!prompt.trim()) return;

    // setIsLoading(true);
    // try {
    //   const app = await createApp({
    //     initialMessage: prompt,
    //   });
    //   router.push(`/app/${app.id}?respond`);
    // } catch (error) {
    //   console.error("Error creating app:", error);
    //   setIsLoading(false);
    // }

    router.push("/app/new?message=" + encodeURIComponent(prompt));
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-4 relative">
      {/* Background dot pattern */}
      <div className="absolute inset-0 w-full h-full overflow-hidden">
        <div className="absolute inset-0 w-full h-full dot-pattern opacity-20"></div>
      </div>
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
          {/* Adaptable width container */}
          <div className="relative w-full max-w-full overflow-hidden">
            {/* Custom input wrapper with adaptive width */}
            <div className="w-full bg-white/90 rounded-md relative z-10 border transition-colors">
              <PromptInput
                isLoading={isLoading}
                value={prompt}
                onValueChange={setPrompt}
                onSubmit={handleSubmit}
                className="relative z-10 border-none bg-transparent shadow-none focus-within:border-gray-400 focus-within:ring-1 focus-within:ring-gray-200 transition-all duration-200 ease-in-out "
              >
                <PromptInputTextarea
                  ref={placeholderRef}
                  placeholder={placeholderText ?? fullPlaceholder}
                  className="min-h-[100px] w-full bg-transparent backdrop-blur-sm pr-12"
                  onFocus={() => {
                    // setGlowColors(RAINBOW_COLORS);
                  }}
                  onBlur={() => {}}
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
            <ExampleButton
              text="Dog Food Marketplace"
              promptText="Build a dog food marketplace where users can browse and purchase premium dog food."
              onClick={setPrompt}
            />
            <ExampleButton
              text="Personal Website"
              promptText="Create a personal website with portfolio, blog, and contact sections."
              onClick={setPrompt}
            />
            <ExampleButton
              text="Burrito B2B SaaS"
              promptText="Build a B2B SaaS for burrito shops to manage inventory, orders, and delivery logistics."
              onClick={setPrompt}
            />
          </div>
        </div>
      </div>
      <div className="flex flex-[3]" />

      <a
        href="https://style.dev"
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-4 right-4 text-xs sm:text-sm font-medium flex items-center gap-1"
      >
        <Button
          variant="pill"
          size="sm"
          className="focus:ring-2 focus:ring-gray-300"
        >
          By Freestyle
        </Button>
      </a>
    </main>
  );
}
