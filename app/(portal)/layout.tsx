import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { Sidebar } from "@/components/sidebar";
import { Topbar } from "@/components/topbar";

export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar username={session.username} role={session.role} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar username={session.username} role={session.role} />
        <main className="flex-1 bg-background">{children}</main>
      </div>
    </div>
  );
}
