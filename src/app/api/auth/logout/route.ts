import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE_NAME, revokeSession, validateSessionToken } from "@/server/auth/session";
import { verifyCsrf } from "@/server/security/csrf";

export async function POST(req: NextRequest) {
  if (!verifyCsrf(req)) {
    return NextResponse.json({ error: "csrf_failed" }, { status: 403 });
  }

  const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (token) {
    const session = await validateSessionToken(token);
    if (session) {
      await revokeSession(session.sessionId, "user_revoked");
    }
  }

  const res = NextResponse.json({ loggedOut: true });
  res.cookies.delete(SESSION_COOKIE_NAME);
  return res;
}
