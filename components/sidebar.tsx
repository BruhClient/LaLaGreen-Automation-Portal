import { SidebarContent } from "@/components/sidebar-content";

export function Sidebar({
  username,
  role,
}: {
  username: string;
  role: "admin" | "user";
}) {
  return (
    <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 border-r border-border bg-card md:flex">
      <SidebarContent username={username} role={role} />
    </aside>
  );
}
