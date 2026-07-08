"use client";

import { useEffect, useState } from "react";
import { SidebarContent } from "@/components/sidebar-content";
import { cn } from "@/lib/utils";

const COLLAPSE_KEY = "sidebar-collapsed";

export function Sidebar({
  username,
  role,
}: {
  username: string;
  role: "admin" | "user";
}) {
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    if (localStorage.getItem(COLLAPSE_KEY) === "1") setCollapsed(true);
  }, []);

  function toggleCollapsed() {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem(COLLAPSE_KEY, next ? "1" : "0");
      return next;
    });
  }

  return (
    <aside
      className={cn(
        "sticky top-0 hidden h-dvh shrink-0 border-r border-border bg-card transition-[width] duration-200 md:flex",
        collapsed ? "w-16" : "w-64"
      )}
    >
      <SidebarContent
        username={username}
        role={role}
        collapsed={collapsed}
        onToggleCollapse={toggleCollapsed}
      />
    </aside>
  );
}
