import Chat from "@/components/chat";
import { AppPageRedirect } from "@/components/redirect";

export default async function AppPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] }>;
  params: Promise<{ id: string }>;
}) {
  const { message } = await searchParams;

  return (
    <div className="h-screen grid grid-cols-1">
      <AppPageRedirect />
      <div className="grid grid-cols-[1fr_2fr] overflow-hidden">
        <div className="overflow-auto">
          <Chat
            appId={"new"}
            initialMessages={[
              {
                content: decodeURIComponent(message as string),
                role: "user",
                id: "init-" + crypto.randomUUID(),
                createdAt: new Date(),
              },
            ]}
            isLoading={true}
          />
        </div>
        <div className="overflow-auto border-l">
          {/* <Preview activeView={activeView} repo={repo} /> */}
        </div>
      </div>
    </div>
  );
}
