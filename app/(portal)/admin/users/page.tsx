"use client";

import { useEffect, useState, useTransition } from "react";
import { ShieldCheck, UserPlus, KeyRound, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import {
  listStaff,
  createStaffMember,
  updateStaffMember,
  resetPassword,
  deleteStaffMember,
  getCurrentUser,
} from "@/lib/actions/staff";

type StaffMember = {
  id: string;
  username: string;
  role: "admin" | "user";
  created_at: string;
};

export default function ManageUsersPage() {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUsername, setCurrentUsername] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Create user dialog
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({ username: "", password: "" });
  const [createError, setCreateError] = useState<string | null>(null);

  // Reset password dialog
  const [resetTarget, setResetTarget] = useState<StaffMember | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [resetError, setResetError] = useState<string | null>(null);

  // Delete dialog
  const [deleteTarget, setDeleteTarget] = useState<StaffMember | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  function reload() {
    startTransition(async () => {
      const staffRes = await listStaff();
      if (staffRes.error) setError(staffRes.error);
      else setStaff((staffRes.data as StaffMember[]) ?? []);
    });
  }

  useEffect(() => {
    startTransition(async () => {
      const [staffRes, me] = await Promise.all([listStaff(), getCurrentUser()]);
      if (staffRes.error) setError(staffRes.error);
      else setStaff((staffRes.data as StaffMember[]) ?? []);
      setCurrentUsername(me?.username ?? null);
      setIsLoading(false);
    });
  }, []);

  function handleCreate() {
    setCreateError(null);
    startTransition(async () => {
      const { error } = await createStaffMember(createForm.username, createForm.password);
      if (error) {
        setCreateError(error);
      } else {
        setShowCreate(false);
        setCreateForm({ username: "", password: "" });
        reload();
      }
    });
  }

  function handleReset() {
    if (!resetTarget) return;
    setResetError(null);
    startTransition(async () => {
      const { error } = await resetPassword(resetTarget.id, newPassword);
      if (error) {
        setResetError(error);
      } else {
        setResetTarget(null);
        setNewPassword("");
      }
    });
  }

  function handleDelete() {
    if (!deleteTarget) return;
    setDeleteError(null);
    startTransition(async () => {
      const { error } = await deleteStaffMember(deleteTarget.id);
      if (error) {
        setDeleteError(error);
      } else {
        setDeleteTarget(null);
        reload();
      }
    });
  }

  function handleDemote(member: StaffMember) {
    startTransition(async () => {
      await updateStaffMember(member.id, { role: "user" });
      reload();
    });
  }

  return (
    <>
      <PageHeader
        icon={ShieldCheck}
        title="Manage Users"
        description="Create staff accounts and manage roles"
      />

      <div className="space-y-8 p-6 md:p-8">
        {error && (
          <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {/* Active Users */}
        <div>
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-foreground">
                Active Users
              </h2>
              {isLoading ? (
                <Skeleton className="mt-0.5 h-3.5 w-16" />
              ) : (
                <p className="text-xs text-muted-foreground">
                  {staff.length} {staff.length === 1 ? "member" : "members"}
                </p>
              )}
            </div>
            <button
              onClick={() => {
                setShowCreate(true);
                setCreateError(null);
              }}
              className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              <UserPlus className="size-4" />
              Create User
            </button>
          </div>

          <div className="rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Username</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Role</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Joined</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <tr key={i} className="border-b border-border last:border-0">
                      <td className="px-4 py-3"><Skeleton className="h-4 w-28" /></td>
                      <td className="px-4 py-3"><Skeleton className="h-5 w-14 rounded-full" /></td>
                      <td className="px-4 py-3"><Skeleton className="h-4 w-20" /></td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          <Skeleton className="h-7 w-7 rounded-md" />
                          <Skeleton className="h-7 w-7 rounded-md" />
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <>
                    {staff.map((member) => (
                      <tr
                        key={member.id}
                        className="border-b border-border last:border-0"
                      >
                        <td className="px-4 py-3 font-medium">{member.username}</td>
                        <td className="px-4 py-3">
                          {member.role === "admin" ? (
                            <button
                              onClick={() => handleDemote(member)}
                              disabled={isPending || member.username === currentUsername}
                              title={
                                member.username === currentUsername
                                  ? "You cannot change your own role"
                                  : "Demote to user"
                              }
                              className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary transition-colors hover:bg-primary/20 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              admin
                            </button>
                          ) : (
                            <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                              user
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {new Date(member.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => {
                                setResetTarget(member);
                                setNewPassword("");
                                setResetError(null);
                              }}
                              className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
                              title="Reset password"
                            >
                              <KeyRound className="size-4" />
                            </button>
                            <button
                              onClick={() => {
                                setDeleteTarget(member);
                                setDeleteError(null);
                              }}
                              className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                              title="Delete user"
                            >
                              <Trash2 className="size-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {staff.length === 0 && (
                      <tr>
                        <td
                          colSpan={4}
                          className="px-4 py-8 text-center text-muted-foreground"
                        >
                          No active users
                        </td>
                      </tr>
                    )}
                  </>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Create User Dialog */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-lg border border-border bg-card p-6 shadow-lg">
            <h2 className="mb-4 text-lg font-semibold">Create User</h2>
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-sm font-medium">Username</label>
                <input
                  type="text"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  value={createForm.username}
                  onChange={(e) =>
                    setCreateForm((f) => ({ ...f, username: e.target.value }))
                  }
                  placeholder="jane"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Password</label>
                <input
                  type="text"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  value={createForm.password}
                  onChange={(e) =>
                    setCreateForm((f) => ({ ...f, password: e.target.value }))
                  }
                  placeholder="Set a password"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                New accounts are created as Staff. Admin access can only be granted directly in the database.
              </p>
              {createError && (
                <p className="text-sm text-destructive">{createError}</p>
              )}
            </div>
            <div className="mt-5 flex justify-end gap-3">
              <button
                onClick={() => setShowCreate(false)}
                className="rounded-md px-4 py-2 text-sm font-medium hover:bg-accent"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={isPending || !createForm.username || !createForm.password}
                className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                <UserPlus className="size-4" />
                {isPending ? "Creating…" : "Create User"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reset Password Dialog */}
      {resetTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-lg border border-border bg-card p-6 shadow-lg">
            <h2 className="mb-1 text-lg font-semibold">Reset Password</h2>
            <p className="mb-4 text-sm text-muted-foreground">
              Set a new password for{" "}
              <span className="font-medium text-foreground">
                {resetTarget.username}
              </span>
            </p>
            <input
              type="password"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="New password"
            />
            {resetError && (
              <p className="mt-2 text-sm text-destructive">{resetError}</p>
            )}
            <div className="mt-5 flex justify-end gap-3">
              <button
                onClick={() => setResetTarget(null)}
                className="rounded-md px-4 py-2 text-sm font-medium hover:bg-accent"
              >
                Cancel
              </button>
              <button
                onClick={handleReset}
                disabled={isPending || !newPassword}
                className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                {isPending ? "Saving…" : "Save Password"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm Dialog */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-lg border border-border bg-card p-6 shadow-lg">
            <h2 className="mb-1 text-lg font-semibold">Delete User</h2>
            <p className="mb-4 text-sm text-muted-foreground">
              Are you sure you want to remove{" "}
              <span className="font-medium text-foreground">
                {deleteTarget.username}
              </span>
              ? This cannot be undone.
            </p>
            {deleteError && (
              <p className="mb-3 text-sm text-destructive">{deleteError}</p>
            )}
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                className="rounded-md px-4 py-2 text-sm font-medium hover:bg-accent"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={isPending}
                className="rounded-md bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50"
              >
                {isPending ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
