import { ToolInvocation } from "ai";
export const LsRenderer = (props: { toolInvocation: ToolInvocation }) => {
  // const { toolInvocation } = props;
  return (
    <div className="flex flex-col">
      <div className="text-sm font-bold">ls</div>
      <div className="text-sm text-gray-500">
        {JSON.stringify(props.toolInvocation.args)}
      </div>
      <div className="text-sm text-gray-500">
        {/* {toolInvocation.state == "result"
          ? "Loading"
          : JSON.stringify(toolInvocation.result)} */}
      </div>
    </div>
  );
};
