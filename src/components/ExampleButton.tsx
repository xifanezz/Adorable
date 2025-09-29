"use client";

import React from "react";
import { Button } from "./ui/button";

interface ExampleButtonProps {
  text: string;
  promptText: string;
  onClick: (text: string) => void;
  className?: string;
}

export function ExampleButton({
  text,
  promptText,
  onClick,
  className,
}: ExampleButtonProps) {
  return (
    <Button
      variant="outline"
      size="sm"
      className={`hover:bg-gray-100 hover:border-gray-300 active:scale-95 transition-all duration-200 rounded-full ${
        className || ""
      }`}
      onClick={() => onClick(promptText)}
      type="button"
    >
      {text}
    </Button>
  );
}

function Examples({ setPrompt }: { setPrompt: (text: string) => void }) {
  return (
    <div className="mt-2">
      <div className="flex flex-wrap justify-center gap-2 px-2 font-tajawal">
        <ExampleButton
          text="متجر طعام الكلاب"
          promptText="بناء متجر إلكتروني لطعام الكلاب حيث يمكن للمستخدمين تصفح وشراء طعام الكلاب المميز."
          onClick={(text) => {
            console.log("Example clicked:", text);
            setPrompt(text);
          }}
        />
        <ExampleButton
          text="موقع شخصي"
          promptText="إنشاء موقع شخصي يحتوي على معرض أعمال ومدونة وقسم التواصل."
          onClick={(text) => {
            console.log("Example clicked:", text);
            setPrompt(text);
          }}
        />
        <ExampleButton
          text="منصة B2B للمطاعم"
          promptText="بناء منصة B2B لمحلات الطعام لإدارة المخزون والطلبات واللوجستيات."
          onClick={(text) => {
            console.log("Example clicked:", text);
            setPrompt(text);
          }}
        />
      </div>
    </div>
  );
}