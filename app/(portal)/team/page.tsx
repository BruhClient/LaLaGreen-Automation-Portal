"use client";

import { useEffect, useState } from "react";
import { Users } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { getStaffDirectory } from "@/lib/actions/staff";

type DirectoryEntry = {
  id: string;
  username: string;
  role: "admin" | "user";
};

export default function TeamPage() {
  const [staff, setStaff] = useState<DirectoryEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    getStaffDirectory().then(({ data, error }) => {
      if (error) setError(error);
      else setStaff((data as DirectoryEntry[]) ?? []);
      setIsLoading(false);
    });
  }, []);

  return (
    <>
      <PageHeader
        icon={Users}
        title="Team"
        description="Everyone with portal access"
      />

      <div className="p-6 md:p-8">
        {error && (
          <div className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <div className="rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Username</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Role</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <tr key={i} className="border-b border-border last:border-0">
                    <td className="px-4 py-3"><Skeleton className="h-4 w-28" /></td>
                    <td className="px-4 py-3"><Skeleton className="h-5 w-14 rounded-full" /></td>
                  </tr>
                ))
              ) : (
                <>
                  {staff.map((member) => (
                    <tr key={member.id} className="border-b border-border last:border-0">
                      <td className="px-4 py-3 font-medium">{member.username}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                            member.role === "admin"
                              ? "bg-primary/10 text-primary"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {member.role === "admin" ? "Admin" : "Staff"}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {staff.length === 0 && (
                    <tr>
                      <td colSpan={2} className="px-4 py-8 text-center text-muted-foreground">
                        No accounts yet
                      </td>
                    </tr>
                  )}
                </>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
