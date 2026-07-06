import Link from "next/link";
import { ppcTopUp } from "@/lib/projects";
import { getSession } from "@/lib/session";
import PpcTopUpCharts from "@/components/ppc-top-up-chart";

export default async function DashboardPage() {
  const session = await getSession();
  const firstName = session?.username ?? "there";

  return (
    <div className="p-6 md:p-8">
      <h2 className="text-2xl font-semibold text-foreground">
        Welcome back, {firstName}
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Here&apos;s an overview of your automations.
      </p>

      <div className="mt-8 flex items-center justify-between">
        <h3 className="text-sm font-medium text-muted-foreground">PPC Top-Up</h3>
        <Link href={ppcTopUp.href} className="text-xs font-medium text-primary hover:underline">
          View all →
        </Link>
      </div>
      <div className="mt-3">
        <PpcTopUpCharts />
      </div>
    </div>
  );
}
