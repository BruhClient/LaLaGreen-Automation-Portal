import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { projects } from "@/lib/projects";
import { getSession } from "@/lib/session";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";

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

      <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {projects.map((project) => {
          const Icon = project.icon;
          return (
            <Link key={project.id} href={project.href} className="group">
              <Card className="h-full border-border p-6 transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md">
                <CardHeader className="gap-3 px-0">
                  <div className="flex items-start justify-between">
                    <div className="flex size-11 items-center justify-center rounded-xl bg-accent transition-colors group-hover:bg-primary/15">
                      <Icon className="size-5 text-primary" />
                    </div>
                    <ArrowUpRight className="size-4 text-muted-foreground opacity-0 transition-all duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-primary group-hover:opacity-100" />
                  </div>
                  <div>
                    <CardTitle className="text-base">{project.name}</CardTitle>
                    <CardDescription className="mt-1">
                      {project.description}
                    </CardDescription>
                  </div>
                </CardHeader>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
