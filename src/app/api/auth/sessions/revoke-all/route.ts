import { NextRequest, NextResponse } from "next/server";
import {
  SESSION_COOKIE_NAME,
  revokeAllSessionsForUser,
  validateSessionToken,
} from "@/server/auth/session";
import { verifyCsrf } from "@/server/security/csrf";

export async function POST(req: NextRequest) {
  if (!verifyCsrf(req)) {
    return NextResponse.json({ error: "csrf_failed" }, { status: 403 });
  }

  const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  const session = token ? await validateSessionToken(token) : null;
  if (!session) {
    return NextResponse.json({ error: "authentication_required" }, { status: 401 });
  }

  await revokeAllSessionsForUser(session.userId);

  const res = NextResponse.json({ revokedAll: true });
  res.cookies.delete(SESSION_COOKIE_NAME);
  return res;
}
