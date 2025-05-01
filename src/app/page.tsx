"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  PromptInput,
  PromptInputTextarea,
  PromptInputActions,
} from "@/components/ui/prompt-input";
import { FrameworkSelector } from "@/components/framework-selector";
import Image from "next/image";
import LogoSvg from "@/logo.svg";
import { useEffect, useState as useReactState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { ExampleButton } from "@/components/ExampleButton";
import { unstable_ViewTransition as ViewTransition } from "react";
import { UserButton } from "@stackframe/stack";
import { ModeToggle } from "@/components/theme-provider";

export default function Home() {
  const [prompt, setPrompt] = useState("");
  const [framework, setFramework] = useState("next");
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

  // Ensure hydration is complete before starting typing animation
  useEffect(() => {
    setIsMounted(true);
  });

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
    setIsLoading(true);
    router.push(
      `/app/new?message=${encodeURIComponent(prompt)}&baseId=${
        {
          next: "nextjs-dkjfgdf",
          vite: "vite-skdjfls",
          expo: "expo-lksadfp",
        }[framework]
      }`
    );
  };

  return (
    <ViewTransition>
      <main className="min-h-screen p-4 relative">
        <div className="flex w-full justify-between items-center">
          <h1 className="text-xl">
            <span className="font-bold">Adorable</span>{" "}
            <a className="" href="https://www.freestyle.sh">
              by freestyle.sh
            </a>
          </h1>
          <div className="flex items-center gap-2">
            <ModeToggle />
            <UserButton />
          </div>
        </div>

        <div className="w-full max-w-lg px-4 sm:px-0 mx-auto flex flex-col items-center mt-40">
          <div className="w-32 h-32 mb-2">
            <Image
              className="dark:invert"
              src={LogoSvg}
              alt="Adorable Logo"
              width={128}
              height={128}
            />
          </div>

          <p className="text-lg sm:text-xl md:text-2xl text-neutral-600 text-center mb-6">
            <a
              href="https://github.com/freestyle-sh/adorable"
              className="rounded inline-block px-2 underline"
            >
              Open Source
            </a>
            AI App Builder
          </p>

          <div className="w-full relative my-5">
            <div className="relative w-full max-w-full overflow-hidden">
              <div className="w-full bg-accent rounded-md relative z-10 border transition-colors">
                <PromptInput
                  leftSlot={
                    <FrameworkSelector
                      value={framework}
                      onChange={setFramework}
                    />
                  }
                  isLoading={isLoading}
                  value={prompt}
                  onValueChange={setPrompt}
                  onSubmit={handleSubmit}
                  className="relative z-10 border-none bg-transparent shadow-none focus-within:border-gray-400 focus-within:ring-1 focus-within:ring-gray-200 transition-all duration-200 ease-in-out "
                >
                  <PromptInputTextarea
                    ref={placeholderRef}
                    placeholder={placeholderText ?? fullPlaceholder}
                    className="min-h-[100px] w-full bg-transparent dark:bg-transparent backdrop-blur-sm pr-12"
                    onBlur={() => {}}
                  />
                  <PromptInputActions>
                    <Button
                      variant={"ghost"}
                      size="sm"
                      onClick={handleSubmit}
                      disabled={isLoading || !prompt.trim()}
                      className="h-7"
                    >
                      Start Creating ⏎
                    </Button>
                  </PromptInputActions>
                </PromptInput>
              </div>
            </div>
          </div>

          <div className="mt-6">
            <p className="text-center text-xs text-gray-500 mb-2">Examples</p>
            <div className="flex flex-wrap justify-center gap-2">
              <ExampleButton
                text="Dog Food Marketplace"
                promptText="Build a dog food marketplace where users can browse and purchase premium dog food."
                onClick={(text) => {
                  console.log("Example clicked:", text);
                  setPrompt(text);
                }}
              />
              <ExampleButton
                text="Personal Website"
                promptText="Create a personal website with portfolio, blog, and contact sections."
                onClick={(text) => {
                  console.log("Example clicked:", text);
                  setPrompt(text);
                }}
              />
              <ExampleButton
                text="Burrito B2B SaaS"
                promptText="Build a B2B SaaS for burrito shops to manage inventory, orders, and delivery logistics."
                onClick={(text) => {
                  console.log("Example clicked:", text);
                  setPrompt(text);
                }}
              />
            </div>
          </div>
        </div>
      </main>
    </ViewTransition>
  );
}
