import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requestLoginEmail } from "@/server/auth/auth-service";
import { getClientContext } from "@/server/http/request-context";
import { checkRateLimit } from "@/server/security/rate-limit";
import { verifyCsrf } from "@/server/security/csrf";

const bodySchema = z.object({ email: z.string().email() });

export async function POST(req: NextRequest) {
  if (!verifyCsrf(req)) {
    return NextResponse.json({ error: "csrf_failed" }, { status: 403 });
  }

  const { ipHash } = getClientContext(req);
  const rateLimit = await checkRateLimit({
    key: `login-request:${ipHash ?? "unknown"}`,
    limit: 5,
    windowSeconds: 60 * 15,
  });
  if (!rateLimit.allowed) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  await requestLoginEmail(parsed.data.email);

  // Always return the same generic response, whether or not the account exists —
  // avoids leaking account existence via response differences (spec section 47).
  return NextResponse.json({
    message: "If an account exists for that email, a login link was sent.",
  });
}
