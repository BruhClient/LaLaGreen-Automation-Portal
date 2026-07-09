import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { createClient } from "@/lib/supabase/server";
import { signSession, setSessionCookie } from "@/lib/session";
import { toRole } from "@/lib/roles";

export async function POST(request: NextRequest) {
  const { username, password } = await request.json();

  if (typeof username !== "string" || typeof password !== "string") {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: staff } = await supabase
    .from("staff")
    .select("username, password_hash, role")
    .eq("username", username.toLowerCase())
    .single();

  const passwordValid = staff
    ? await bcrypt.compare(password, staff.password_hash)
    : false;

  if (!staff || !passwordValid) {
    return NextResponse.json(
      { error: "Invalid username or password" },
      { status: 401 }
    );
  }

  const token = await signSession({
    username: staff.username,
    role: toRole(staff.role),
  });
  await setSessionCookie(token);

  return NextResponse.json({ ok: true });
}
