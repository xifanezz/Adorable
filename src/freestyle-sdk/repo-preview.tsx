import {
  QueryClient,
  QueryClientProvider,
  useQuery,
} from "@tanstack/react-query";
import { requestDevServer } from "./action";

const queryClient = new QueryClient();

const defaultLoadingComponent = () => {
  return (
    <div className="flex items-center justify-center h-full">
      <div className="text-gray-500">Loading...</div>
    </div>
  );
};

const defaultStartingComponent = () => {
  return (
    <div className="flex items-center justify-center h-full">
      <div className="text-gray-500">Starting...</div>
    </div>
  );
};

export function FreestyleDevServer({
  repo,
  loadingComponent,
  startingComponent,
}: {
  repo: string;
  loadingComponent?: React.ReactNode;
  startingComponent?: React.ReactNode;
}) {
  return (
    <QueryClientProvider client={queryClient}>
      <FreestyleDevServerInner
        repo={repo}
        loadingComponent={
          loadingComponent ? loadingComponent : defaultLoadingComponent()
        }
        startingComponent={
          startingComponent ? startingComponent : defaultStartingComponent()
        }
      />
    </QueryClientProvider>
  );
}

function FreestyleDevServerInner({
  repo,
  loadingComponent,
  startingComponent,
}: {
  repo: string;
  loadingComponent: React.ReactNode;
  startingComponent: React.ReactNode;
}) {
  const { data, isLoading } = useQuery({
    queryKey: ["dev-server", repo],
    queryFn: async () => await requestDevServer({ repo }),
    refetchInterval: 1000,
  });

  if (isLoading) {
    return loadingComponent;
  }

  if (!data?.devCommandRunning) {
    return startingComponent ?? loadingComponent;
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
