import type { NextRequest } from "next/server";
import { SESSION_COOKIE_NAME, validateSessionToken } from "@/server/auth/session";

/** Shared by any route that just needs "is there a valid session" — not a route module
 * itself (Next.js route files may only export HTTP method handlers). */
export async function requireSession(req: NextRequest) {
  const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;
  return validateSessionToken(token);
}
