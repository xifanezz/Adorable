import Chat from "../../../components/chat";
import Preview from "../../../components/preview";

export default function IdPage() {
  return (
    <div className="flex min-h-screen">
      <div className="w-1/4 border-r p-4">
        <Chat />
      </div>
      <div className="w-3/4 p-4">
        <Preview />
      </div>
    </div>
  );
}
