"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutGrid, Users, Users2 } from "lucide-react";
import { projects } from "@/lib/projects";
import { tools } from "@/lib/tools";
import { cn } from "@/lib/utils";
import { UserMenu } from "@/components/user-menu";

export function SidebarContent({
  username,
  role,
}: {
  username: string;
  role: "admin" | "user";
}) {
  const pathname = usePathname();

  return (
    <div className="flex h-full w-full flex-col">
      <div className="p-6">
        <h1 className="text-lg font-bold tracking-tight text-foreground">
          LáLáGreen
          <sup className="ml-0.5 text-[10px] font-normal">&reg;</sup>
        </h1>
        <p className="text-xs text-muted-foreground">Automation Portal</p>
      </div>

      <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto px-3">
        <Link
          href="/dashboard"
          className={cn(
            "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium text-foreground hover:bg-accent",
            pathname === "/dashboard" && "bg-accent text-primary"
          )}
        >
          <LayoutGrid className="size-4" />
          Dashboard
        </Link>

        <Link
          href="/team"
          className={cn(
            "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium text-foreground hover:bg-accent",
            pathname === "/team" && "bg-accent text-primary"
          )}
        >
          <Users2 className="size-4" />
          Team
        </Link>

        <p className="px-3 pt-4 pb-1 text-xs font-medium text-muted-foreground">
          Automations
        </p>

        {projects.map((project) => {
          const Icon = project.icon;
          return (
            <Link
              key={project.id}
              href={project.href}
              className="flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium text-foreground hover:bg-accent"
            >
              <Icon className="size-4 shrink-0" />
              <span className="flex-1 truncate">{project.name}</span>
            </Link>
          );
        })}

        <p className="px-3 pt-4 pb-1 text-xs font-medium text-muted-foreground">
          Tools
        </p>

        {tools.map((tool) => {
          const Icon = tool.icon;
          return (
            <Link
              key={tool.id}
              href={tool.href}
              className="flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium text-foreground hover:bg-accent"
            >
              <Icon className="size-4 shrink-0" />
              <span className="flex-1 truncate">{tool.name}</span>
            </Link>
          );
        })}
      </nav>

      {role === "admin" && (
        <div className="px-3 pb-2">
          <p className="px-3 pt-4 pb-1 text-xs font-medium text-muted-foreground">
            Admin
          </p>
          <Link
            href="/admin/users"
            className={cn(
              "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium text-foreground hover:bg-accent",
              pathname === "/admin/users" && "bg-accent text-primary"
            )}
          >
            <Users className="size-4 shrink-0" />
            <span className="flex-1 truncate">Manage Users</span>
          </Link>
        </div>
      )}

      <div className="mt-auto shrink-0 border-t border-border p-3 pb-4">
        <UserMenu username={username} />
      </div>
    </div>
  );
}
