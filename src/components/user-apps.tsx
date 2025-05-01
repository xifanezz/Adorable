import { useQuery } from "@tanstack/react-query";
import { getUserApps } from "@/actions/user-apps";
import { Card, CardDescription, CardHeader, CardTitle } from "./ui/card";

export function UserApps() {
  const { data } = useQuery({
    queryKey: ["userApps"],
    queryFn: getUserApps,
    initialData: [],
  });

  return (
    <div className="flex gap-2 justify-center items-center">
      {data.map((app) => (
        <a
          href={`/app/${app.id}`}
          key={app.id}
          className="w-full cursor-pointer w-sm"
        >
          <Card className="p-4 border-b border rounded-md">
            <CardHeader>
              <CardTitle>{app.firstMessage?.content}</CardTitle>
              <CardDescription>
                Created {new Date(app.createdAt).toLocaleDateString()}
              </CardDescription>
            </CardHeader>
          </Card>
        </a>
      ))}
    </div>
  );
}
