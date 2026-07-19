import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken, COOKIE_NAME } from "@/lib/session";

export async function proxy(request: NextRequest) {
  const token = request.cookies.get(COOKIE_NAME)?.value;
  const session = token ? await verifySessionToken(token) : null;

  if (!session) {
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  const { pathname } = request.nextUrl;
  if (pathname.startsWith("/admin")) {
    // Admins can reach any /admin route. Moderators can reach only /admin/users
    // (to create users and reset user passwords). Everyone else is bounced.
    const allowed =
      session.role === "admin" ||
      (session.role === "moderator" && pathname === "/admin/users");
    if (!allowed) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!login|api/auth/login|_next/static|_next/image|favicon.ico).*)",
  ],
};
