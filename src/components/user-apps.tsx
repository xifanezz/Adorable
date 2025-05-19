import { useQuery } from "@tanstack/react-query";
import { getUserApps } from "@/actions/user-apps";
import { AppCard } from "./app-card";

export function UserApps() {
  const { data } = useQuery({
    queryKey: ["userApps"],
    queryFn: getUserApps,
    initialData: [],
  });

  return (
    <div className="grid grid-cols-4 gap-2 justify-center items-center px-8">
      {data.map((app) => (
        <AppCard 
          key={app.id}
          id={app.id}
          name={app.name}
          createdAt={app.createdAt}
        />
      ))}
    </div>
  );
}
