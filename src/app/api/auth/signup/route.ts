import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { signUpWithEmail, AuthError } from "@/server/auth/auth-service";
import { getClientContext } from "@/server/http/request-context";
import { checkRateLimit } from "@/server/security/rate-limit";
import { verifyCsrf } from "@/server/security/csrf";

const bodySchema = z.object({
  email: z.string().email(),
  username: z
    .string()
    .min(3)
    .max(24)
    .regex(/^[a-zA-Z0-9_]+$/, "Username may only contain letters, numbers, and underscores"),
  displayName: z.string().min(1).max(40),
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  ageAcknowledged18Plus: z.boolean(),
  country: z.string().length(2),
  stateOrProvince: z.string().max(10).optional(),
  marketingConsent: z.boolean(),
  termsAccepted: z.boolean(),
});

export async function POST(req: NextRequest) {
  if (!verifyCsrf(req)) {
    return NextResponse.json({ error: "csrf_failed" }, { status: 403 });
  }

  const { ipHash } = getClientContext(req);

  const rateLimit = await checkRateLimit({
    key: `signup:${ipHash ?? "unknown"}`,
    limit: 5,
    windowSeconds: 60 * 60,
  });
  if (!rateLimit.allowed) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_request", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  try {
    const result = await signUpWithEmail({
      ...parsed.data,
      sessionCorrelationId: randomUUID(),
    });
    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    if (err instanceof AuthError) {
      const status =
        err.code === "not_eligible" ? 403 : err.code === "terms_not_accepted" ? 400 : 409;
      return NextResponse.json({ error: err.code, message: err.message }, { status });
    }
    throw err;
  }
}
