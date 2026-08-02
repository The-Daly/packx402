import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { completeWalletAuth, AuthError } from "@/server/auth/auth-service";
import {
  SESSION_COOKIE_NAME,
  sessionCookieOptions,
  validateSessionToken,
} from "@/server/auth/session";
import { getClientContext } from "@/server/http/request-context";
import { checkRateLimit } from "@/server/security/rate-limit";
import { verifyCsrf } from "@/server/security/csrf";

const bodySchema = z.object({
  chain: z.enum(["algorand", "solana", "evm"]),
  address: z.string().min(1),
  signature: z.string().min(1),
  message: z.string().min(1),
  isLinking: z.boolean().default(false),
});

export async function POST(req: NextRequest) {
  if (!verifyCsrf(req)) {
    return NextResponse.json({ error: "csrf_failed" }, { status: 403 });
  }

  const { ipHash, userAgent } = getClientContext(req);
  const rateLimit = await checkRateLimit({
    key: `wallet-verify:${ipHash ?? "unknown"}`,
    limit: 20,
    windowSeconds: 60 * 15,
  });
  if (!rateLimit.allowed) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  let linkingUserId: string | undefined;
  if (parsed.data.isLinking) {
    const existingToken = req.cookies.get(SESSION_COOKIE_NAME)?.value;
    const existingSession = existingToken ? await validateSessionToken(existingToken) : null;
    if (!existingSession) {
      return NextResponse.json({ error: "authentication_required" }, { status: 401 });
    }
    linkingUserId = existingSession.userId;
  }

  try {
    const { token, expiresAt, userId } = await completeWalletAuth({
      chain: parsed.data.chain,
      address: parsed.data.address,
      signature: parsed.data.signature,
      message: parsed.data.message,
      linkingUserId,
      sessionParams: { ipHash, userAgent },
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
