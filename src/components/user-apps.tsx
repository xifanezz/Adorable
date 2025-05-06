import { useQuery } from "@tanstack/react-query";
import { getUserApps } from "@/actions/user-apps";
import { Card, CardDescription, CardHeader, CardTitle } from "./ui/card";
import Link from "next/link";

export function UserApps() {
  const { data } = useQuery({
    queryKey: ["userApps"],
    queryFn: getUserApps,
    initialData: [],
  });

  return (
    <div className="grid grid-cols-4 gap-2 justify-center items-center px-8">
      {data.map((app) => (
        <Link href={`/app/${app.id}`} key={app.id} className="cursor-pointer">
          <Card className="p-4 border-b border rounded-md h-36">
            <CardHeader>
              <CardTitle>{app.name}</CardTitle>
              <CardDescription>
                Created {new Date(app.createdAt).toLocaleDateString()}
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>
      ))}
    </div>
  );
}
