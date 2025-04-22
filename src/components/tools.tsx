"use client";

import { ToolInvocation } from "ai";

export function ToolMessage({
  toolInvocation,
}: {
  toolInvocation: ToolInvocation;
  className?: string;
}) {
  if (toolInvocation.toolName === "list_directory") {
    return (
      <ToolBlock name="list directory" argsText={toolInvocation.args.path} />
    );
  }

  if (toolInvocation.toolName === "read_file") {
    return <ToolBlock name="read file" argsText={toolInvocation.args.path} />;
  }

  if (toolInvocation.toolName === "edit_file") {
    return <EditFileTool toolInvocation={toolInvocation} />;
  }

  if (toolInvocation.toolName === "write_file") {
    return <WriteFileTool toolInvocation={toolInvocation} />;
  }

  // Fallback for other tools
  return (
    <ToolBlock name={toolInvocation.toolName.replace("_", " ")}>
      <div className="text-sm text-gray-500">
        {JSON.stringify(toolInvocation.args, null, 2)}
      </div>
      {toolInvocation.state === "result" && (
        <div>
          {toolInvocation.result.content.map((content, index) => (
            <DefaultContentRenderer content={content} key={index} />
          ))}
        </div>
      )}
    </ToolBlock>
  );
}

function DefaultContentRenderer(props: {
  content: {
    type: "text";
    text: string;
  };
}) {
  if (props.content.type === "text") {
    return <div className="text-sm text-gray-500">{props.content.text}</div>;
  }

  return (
    <div className="text-sm text-gray-500">{JSON.stringify(props.content)}</div>
  );
}

function EditFileTool({ toolInvocation }: { toolInvocation: ToolInvocation }) {
  return (
    <ToolBlock name="edit file" argsText={toolInvocation.args.path}>
      <div className="grid gap-2">
        {toolInvocation.args.edits.map(
          (edit: { newText: string; oldText: string }, index: number) => (
            <div key={index} className="rounded overflow-hidden">
              <div className="bg-red-200 font-mono text-xs whitespace-pre-wrap pl-2">
                {edit.oldText
                  .split("\n")
                  .map((line) => "- " + line)
                  .join("\n")}
              </div>
              <div className="bg-green-200 font-mono text-xs whitespace-pre-wrap pl-2">
                {edit.newText
                  .split("\n")
                  .map((line) => "+ " + line)
                  .join("\n")}
              </div>
            </div>
          )
        )}
      </div>
    </ToolBlock>
  );
}

function WriteFileTool({ toolInvocation }: { toolInvocation: ToolInvocation }) {
  return (
    <ToolBlock
      name="write file"
      argsText={toolInvocation.args.path}
      toolInvocation={toolInvocation}
    >
      <div className="rounded overflow-hidden">
        <div className="bg-green-200 font-mono text-xs whitespace-pre-wrap pl-2">
          {toolInvocation.args.content
            .split("\n")
            .map((line: string) => "+ " + line)
            .join("\n")}
        </div>
      </div>
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
        <div className="text-sm bg-gray-800 text-white px-2 rounded">
          <span className="font-bold">{props.name}</span>{" "}
          <span className="text-gray-200">{props.argsText}</span>
        </div>
      </div>
      {props.children && <div className="mb-2">{props.children}</div>}
    </div>
  );
}
