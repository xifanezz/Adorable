"use client";

import { Card, CardDescription, CardHeader, CardTitle } from "./ui/card";
import Link from "next/link";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import {
  ChevronRightIcon,
  Trash,
  ExternalLink,
  GitForkIcon,
  MoreVertical,
} from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";

type AppCardProps = {
  id: string;
  name: string;
  createdAt: string;
};

export function AppCard({ id, name, createdAt }: AppCardProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);

  const handleOpen = (e: React.MouseEvent) => {
    e.preventDefault();
    router.push(`/app/${id}`);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.preventDefault();
    // TODO: Implement delete functionality
    console.log(`Delete app: ${id}`);
  };

  const handleFork = (e: React.MouseEvent) => {
    e.preventDefault();
    // TODO: Implement fork functionality
    console.log(`Fork app: ${id}`);
  };

  return (
    <Card className="p-4 border-b border rounded-md h-36 relative">
      <Link href={`/app/${id}`} className="cursor-pointer block">
        <CardHeader>
          <CardTitle>{name}</CardTitle>
          <CardDescription>
            Created {new Date(createdAt).toLocaleDateString()}
          </CardDescription>
        </CardHeader>
      </Link>

      <div className="absolute top-2 right-2 transition-opacity">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 focus:outline-none">
              <MoreVertical className="h-4 w-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={handleOpen}>
              <ExternalLink className="mr-2 h-4 w-4" />
              Open
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleFork}>
              <GitForkIcon className="mr-2 h-4 w-4" />
              Fork
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleDelete}
              className="text-red-600 dark:text-red-400"
            >
              <Trash className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </Card>
  );
}
