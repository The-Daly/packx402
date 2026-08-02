import { NextRequest, NextResponse } from "next/server";
import {
  SESSION_COOKIE_NAME,
  listActiveSessionsForUser,
  validateSessionToken,
} from "@/server/auth/session";

export async function GET(req: NextRequest) {
  const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  const session = token ? await validateSessionToken(token) : null;
  if (!session) {
    return NextResponse.json({ error: "authentication_required" }, { status: 401 });
  }

  const sessions = await listActiveSessionsForUser(session.userId);
  return NextResponse.json({
    sessions: sessions.map((s) => ({ ...s, isCurrent: s.id === session.sessionId })),
  });
}
