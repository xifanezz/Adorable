"use client";

import { cn } from "@/lib/utils";
import { ChevronDownIcon } from "lucide-react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type FrameworkSelectorProps = {
  value?: string;
  onChange?: (value: string) => void;
  className?: string;
};

export function FrameworkSelector({
  value = "next",
  onChange,
  className,
}: FrameworkSelectorProps) {
  // Map of framework names to their respective logos
  const frameworkLogos = {
    next: "/logos/next.svg",
    vite: "/logos/vite.svg",
    // expo: "/logos/expo.svg",
  };

  // Map of framework names to their display names
  const frameworkNames = {
    next: "Next.js",
    vite: "Vite",
    // expo: "Expo",
  };

  const handleSelect = (framework: string) => {
    onChange?.(framework);
  };

  return (
    <div className={cn("relative", className)}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="h-7 gap-2 px-2 text-xs bg-transparent border-none hover:bg-gray-100 hover:bg-opacity-50 shadow-none"
            style={{ boxShadow: "none" }}
          >
            <Image
              src={frameworkLogos[value as keyof typeof frameworkLogos]}
              alt={frameworkNames[value as keyof typeof frameworkNames]}
              width={16}
              height={16}
              className="opacity-90"
            />
            {frameworkNames[value as keyof typeof frameworkNames]}
            <ChevronDownIcon className="h-3 w-3 opacity-70" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="start"
          className="min-w-[8rem] shadow-none !shadow-none border border-gray-200"
          style={{ boxShadow: "none" }}
        >
          {Object.entries(frameworkNames).map(([key, name]) => (
            <DropdownMenuItem
              key={key}
              onClick={() => handleSelect(key)}
              className="gap-2 text-xs"
            >
              <Image
                src={frameworkLogos[key as keyof typeof frameworkLogos]}
                alt={name}
                width={16}
                height={16}
                className="opacity-90"
              />
              {name}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
