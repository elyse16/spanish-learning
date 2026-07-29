import { cookies } from "next/headers";
import type { NextResponse } from "next/server";

export const PROFILE_COOKIE = "profile_id";
export const PROFILE_NAME_COOKIE = "profile_name";

const YEAR = 60 * 60 * 24 * 365;

/** Current profile id from the cookie (server components / route handlers). */
export function getProfileId(): string | null {
  return cookies().get(PROFILE_COOKIE)?.value ?? null;
}

/** Current profile display name from the cookie. */
export function getProfileName(): string | null {
  return cookies().get(PROFILE_NAME_COOKIE)?.value ?? null;
}

/** Set the active-profile cookies on a response (used after select/create). */
export function setProfileCookies(res: NextResponse, id: string, name: string) {
  const opts = {
    httpOnly: true,
    sameSite: "lax" as const,
    path: "/",
    maxAge: YEAR,
  };
  res.cookies.set(PROFILE_COOKIE, id, opts);
  res.cookies.set(PROFILE_NAME_COOKIE, name, opts);
}
