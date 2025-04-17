import {
  QueryClient,
  QueryClientProvider,
  useQuery,
} from "@tanstack/react-query";
import { requestDevServer } from "./action";

const queryClient = new QueryClient();

export function FreestyleDevServer({ repo }: { repo: string }) {
  return (
    <QueryClientProvider client={queryClient}>
      <FreestyleDevServerInner repo={repo} />
    </QueryClientProvider>
  );
}

function FreestyleDevServerInner({ repo }: { repo: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ["dev-server", repo],
    queryFn: async () => await requestDevServer({ repo }),
    refetchInterval: 1000,
  });

  if (isLoading) {
    return <div>Creating VM...</div>;
  }

  if (!data?.devCommandRunning) {
    return <div>Starting Dev Server...</div>;
  }

  return (
    <iframe
      sandbox="allow-scripts allow-same-origin allow-forms"
      src={data.ephemeralUrl}
      style={{
        width: "100%",
        height: "100%",
        border: "none",
      }}
    />
  );
}
