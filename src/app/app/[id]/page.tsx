import Chat from "../../../components/chat";
import Preview from "../../../components/preview";

export default function IdPage() {
  return (
    <div className="flex min-h-screen">
      <div className="w-1/3 border-r ">
        <Chat />
      </div>
      <div className="w-2/3 p-4">
        <Preview />
      </div>
    </div>
  );
}
