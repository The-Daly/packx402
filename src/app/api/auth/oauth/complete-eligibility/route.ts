import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { SESSION_COOKIE_NAME, validateSessionToken } from "@/server/auth/session";
import { submitOAuthEligibility } from "@/server/auth/auth-service";

/**
 * Closes the eligibility gap noted in auth-service.ts's findOrCreateGoogleUser /
 * completeWalletAuth: neither Google nor wallet sign-in collects DOB/location at
 * account-creation time, so this must be called (and pass) before createPackOffer()
 * will allow a purchase — see the check added there. Requires an existing session
 * (Google or wallet) since it operates on the already-authenticated user, never on a
 * client-supplied userId.
 */
const bodySchema = z.object({
  dateOfBirth: z.string(), // ISO date (YYYY-MM-DD)
  ageAcknowledged18Plus: z.boolean(),
  country: z.string().length(2),
  stateOrProvince: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!token) {
    return NextResponse.json({ error: "authentication_required" }, { status: 401 });
  }
  const session = await validateSessionToken(token);
  if (!session) {
    return NextResponse.json({ error: "authentication_required" }, { status: 401 });
  }

  const body = bodySchema.safeParse(await req.json().catch(() => ({})));
  if (!body.success) {
    return NextResponse.json(
      { error: "invalid_request", issues: body.error.issues },
      { status: 400 },
    );
  }

  const result = await submitOAuthEligibility({
    userId: session.userId,
    dateOfBirth: body.data.dateOfBirth,
    ageAcknowledged18Plus: body.data.ageAcknowledged18Plus,
    country: body.data.country,
    stateOrProvince: body.data.stateOrProvince,
    sessionCorrelationId: session.sessionId,
  });

  if (!result.eligible) {
    return NextResponse.json(
      { eligible: false, reasons: result.reasons },
      { status: 403 },
    );
  }

  return NextResponse.json({ eligible: true });
}
