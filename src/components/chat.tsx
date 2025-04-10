import { PromptInputBasic } from "./chatinput";

export default function Chat() {
  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 overflow-y-auto p-3 flex-col text-center ">
        chat
      </div>
      <div className="p-3">
        {/* <textarea
          className="w-full border rounded-lg p-3 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none text-sm"
          placeholder="Type your prompt..."
          rows={3}
        /> */}
        <PromptInputBasic />
      </div>
    </div>
  );
}
