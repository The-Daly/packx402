import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { completeEmailLogin, AuthError } from "@/server/auth/auth-service";
import { SESSION_COOKIE_NAME, sessionCookieOptions } from "@/server/auth/session";
import { getClientContext } from "@/server/http/request-context";

const querySchema = z.object({ token: z.string().min(10) });

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const parsed = querySchema.safeParse({ token: url.searchParams.get("token") });
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  const { ipHash, userAgent } = getClientContext(req);

  try {
    const { token, expiresAt, userId } = await completeEmailLogin(parsed.data.token, {
      ipHash,
      userAgent,
    });
    const res = NextResponse.json({ userId, loggedIn: true });
    res.cookies.set(SESSION_COOKIE_NAME, token, sessionCookieOptions(expiresAt));
    return res;
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.code, message: err.message }, { status: 400 });
    }
    throw err;
  }
}
