'use client';

import React from 'react';
import { Button } from './ui/button';

interface ExampleButtonProps {
  text: string;
  promptText: string;
  onClick: (text: string) => void;
  className?: string;
}

export function ExampleButton({ text, promptText, onClick, className }: ExampleButtonProps) {
  return (
    <Button
      variant="pill"
      className={className}
      onClick={() => onClick(promptText)}
    >
      {text}
    </Button>
  );
}