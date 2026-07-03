"use server";

import bcrypt from "bcryptjs";
import { createClient } from "@/lib/supabase/server";
import { getSession } from "@/lib/session";

const USERNAME_PATTERN = /^[a-z0-9_-]{3,32}$/;

async function requireAdmin() {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return { client: null, session: null, error: "Unauthorized" as const };
  }
  const client = await createClient();
  return { client, session, error: null };
}

export async function listStaff() {
  const { client, error } = await requireAdmin();
  if (error) return { data: null, error };

  const { data, error: dbError } = await client!
    .from("staff")
    .select("id, username, role, created_at")
    .order("created_at", { ascending: true });

  return { data, error: dbError?.message ?? null };
}

export async function getStaffDirectory() {
  const session = await getSession();
  if (!session) return { data: null, error: "Unauthorized" };

  const client = await createClient();
  const { data, error: dbError } = await client
    .from("staff")
    .select("id, username, role")
    .order("role", { ascending: true })
    .order("username", { ascending: true });

  return { data, error: dbError?.message ?? null };
}

export async function getCurrentUser() {
  const session = await getSession();
  return session ? { username: session.username, role: session.role } : null;
}

export async function createStaffMember(username: string, password: string) {
  const { client, error } = await requireAdmin();
  if (error) return { data: null, error };

  const normalized = username.toLowerCase();
  if (!USERNAME_PATTERN.test(normalized)) {
    return {
      data: null,
      error: "Username must be 3-32 characters: lowercase letters, numbers, - or _",
    };
  }
  if (!password) {
    return { data: null, error: "Password is required" };
  }

  const password_hash = bcrypt.hashSync(password, 10);

  const { data, error: dbError } = await client!
    .from("staff")
    .insert({ username: normalized, password_hash, role: "user" })
    .select("id, username, role, created_at")
    .single();

  if (dbError) {
    const message = dbError.code === "23505" ? "Username already taken" : dbError.message;
    return { data: null, error: message };
  }

  return { data, error: null };
}

export async function updateStaffMember(
  id: string,
  updates: { role?: "admin" | "user" }
) {
  const { client, session, error } = await requireAdmin();
  if (error) return { data: null, error };

  if (updates.role === "admin") {
    return { data: null, error: "Admins can only be added directly in the database" };
  }

  if (updates.role !== undefined) {
    const { data: target } = await client!
      .from("staff")
      .select("username")
      .eq("id", id)
      .single();
    if (target?.username === session!.username) {
      return { data: null, error: "You cannot change your own role" };
    }
  }

  const { data, error: dbError } = await client!
    .from("staff")
    .update(updates)
    .eq("id", id)
    .select("id, username, role, created_at")
    .single();

  return { data, error: dbError?.message ?? null };
}

export async function resetPassword(id: string, newPassword: string) {
  const { client, error } = await requireAdmin();
  if (error) return { data: null, error };

  const password_hash = bcrypt.hashSync(newPassword, 10);

  const { error: dbError } = await client!
    .from("staff")
    .update({ password_hash })
    .eq("id", id);

  return { data: { ok: true }, error: dbError?.message ?? null };
}

export async function deleteStaffMember(id: string) {
  const { client, session, error } = await requireAdmin();
  if (error) return { data: null, error };

  const { data: target } = await client!
    .from("staff")
    .select("username")
    .eq("id", id)
    .single();

  if (target?.username === session!.username) {
    return { data: null, error: "You cannot delete your own account" };
  }

  const { error: dbError } = await client!.from("staff").delete().eq("id", id);

  return { data: { ok: true }, error: dbError?.message ?? null };
}
