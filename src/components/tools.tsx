"use client";

import { cn } from "@/lib/utils";
import { ToolInvocation } from "ai";

export function ToolMessage({
  toolInvocation,
}: {
  toolInvocation: ToolInvocation;
  className?: string;
}) {
  if (toolInvocation.toolName === "list_directory") {
    return (
      <ToolBlock
        name="listing directory"
        argsText={toolInvocation.args?.path?.split("/").slice(2).join("/")}
        toolInvocation={toolInvocation}
      />
    );
  }

  if (toolInvocation.toolName === "read_file") {
    return (
      <ToolBlock
        name="read file"
        argsText={toolInvocation.args?.path?.split("/").slice(2).join("/")}
        toolInvocation={toolInvocation}
      />
    );
  }

  if (toolInvocation.toolName === "edit_file") {
    return <EditFileTool toolInvocation={toolInvocation} />;
  }

  if (toolInvocation.toolName === "write_file") {
    return <WriteFileTool toolInvocation={toolInvocation} />;
  }

  if (toolInvocation.toolName === "exec") {
    return (
      <ToolBlock
        name="exec"
        toolInvocation={toolInvocation}
        argsText={toolInvocation.args?.command}
      />
    );
  }

  if (toolInvocation.toolName === "create_directory") {
    return (
      <ToolBlock
        name="create directory"
        toolInvocation={toolInvocation}
        argsText={toolInvocation.args?.path?.split("/").slice(2).join("/")}
      />
    );
  }

  // Fallback for other tools
  return (
    <ToolBlock
      toolInvocation={toolInvocation}
      name={toolInvocation.toolName.replaceAll("_", " ")}
    >
      {/* <div className="text-sm text-gray-500">
        {JSON.stringify(toolInvocation.args, null, 2)}
      </div>
      {toolInvocation.state === "result" && (
        <div>
          {toolInvocation.result.content?.map((content, index) => (
            <DefaultContentRenderer content={content} key={index} />
          ))}
        </div>
      )} */}
    </ToolBlock>
  );
}

function DefaultContentRenderer(props: {
  content: {
    type: "text";
    text: string;
  };
}) {
  if (props.content?.type === "text") {
    return <div className="text-sm text-gray-500">{props.content?.text}</div>;
  }

  return (
    <div className="text-sm text-gray-500">{JSON.stringify(props.content)}</div>
  );
}

function EditFileTool({ toolInvocation }: { toolInvocation: ToolInvocation }) {
  return (
    <ToolBlock
      name="edit file"
      argsText={toolInvocation.args?.path?.split("/").slice(2).join("/")}
      toolInvocation={toolInvocation}
    >
      {/* <div className="grid gap-2">
        {toolInvocation.args?.edits?.map(
          (edit: { newText: string; oldText: string }, index: number) => (
            <div key={index} className="rounded overflow-hidden">
              <div className="bg-red-200 font-mono text-xs whitespace-pre-wrap pl-2">
                {edit?.oldText
                  ?.split("\n")
                  .map((line) => "- " + line)
                  .join("\n")
                  .slice(edit.oldText.length > 5 ? -5 : 0)}
              </div>
              <div className="bg-green-200 font-mono text-xs whitespace-pre-wrap pl-2">
                {edit?.newText
                  ?.split("\n")
                  .map((line) => "+ " + line)
                  .join("\n")
                  .slice(edit.newText.length > 5 ? -5 : 0)}
              </div>
            </div>
          )
        )}
      </div> */}
    </ToolBlock>
  );
}

function WriteFileTool({ toolInvocation }: { toolInvocation: ToolInvocation }) {
  return (
    <ToolBlock
      name="write file"
      argsText={toolInvocation.args?.path?.split("/").slice(2).join("/")}
      toolInvocation={toolInvocation}
    >
      {/* <div className="rounded overflow-hidden">
        <div className="bg-green-200 font-mono text-xs whitespace-pre-wrap pl-2">
          {toolInvocation.args?.content
            ?.split("\n")
            .map((line: string) => "+ " + line)
            .slice(toolInvocation.args?.content > 5 ? -5 : 0)
            .join("\n")}
        </div>
      </div> */}
    </ToolBlock>
  );
}

function ToolBlock(props: {
  toolInvocation?: ToolInvocation;
  name: string;
  argsText?: string;
  children?: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex py-1">
        <div
          className={cn(
            "text-sm  px-2 mt-2 py-1 rounded max-h-24 overflow-scroll max-w-sm transition-colors duration-500",
            props.toolInvocation?.state !== "result"
              ? "border border-gray-800 animate-pulse bg-gray-800 text-white"
              : "border border-neutral-500 text-neutral-500 bg-transparent"
          )}
        >
          <span className="font-bold">{props.name}</span>{" "}
          <span
            className={cn(
              props.toolInvocation?.state !== "result" ? "text-gray-200" : ""
            )}
          >
            {props.argsText}
          </span>
        </div>
      </div>
      {props.children && <div className="mb-2">{props.children}</div>}
    </div>
  );
}
