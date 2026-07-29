import { NextRequest, NextResponse } from "next/server";
import { PROFILE_COOKIE } from "@/lib/profile";

// Redirect page navigations to the profile picker until a profile is chosen.
// API routes are not redirected — they check the cookie themselves and return
// 401 so the client can react.
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const hasProfile = req.cookies.has(PROFILE_COOKIE);
  const isPicker = pathname === "/profiles";
  const isApi = pathname.startsWith("/api");

  if (!hasProfile && !isPicker && !isApi) {
    const url = req.nextUrl.clone();
    url.pathname = "/profiles";
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
