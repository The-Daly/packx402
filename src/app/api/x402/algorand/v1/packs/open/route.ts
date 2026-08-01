import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { validateSessionToken, SESSION_COOKIE_NAME } from "@/server/auth/session";
import {
  createPackOffer,
  settleOfferAndOpen,
  OfferCreationError,
  PaymentSettlementError,
} from "@/server/packs/offer-service";
import { PACK_TIERS } from "@/server/config/pack-tiers";
import { db } from "@/server/db/client";
import { rips, fairnessProofs } from "@/server/db/schema";
import { eq } from "drizzle-orm";

/**
 * x402 competition endpoint (spec section 41).
 *   - No offer yet / no X-PAYMENT header -> 402 with PaymentRequirements.
 *   - X-PAYMENT header present -> verify, settle, run fairness selection, return the
 *     opened resource with an X-PAYMENT-RESPONSE header carrying the settlement receipt.
 *
 * Defaults to TestNet; MainNet requires ALGORAND_NETWORK=mainnet AND
 * ALGORAND_MAINNET_ENABLED=true (validated in src/server/env.ts at process start) and is
 * never initiated automatically by this endpoint.
 */

const openBodySchema = z.object({
  tierKey: z.enum([
    "spark",
    "starter",
    "scout",
    "bronze",
    "silver",
    "gold",
    "prism",
    "platinum",
    "obsidian",
    "mythic",
    "crown",
    "vault",
    "grail",
    "genesis",
  ]),
  network: z.enum(["testnet", "mainnet"]).default("testnet"),
});

async function requireUserId(req: NextRequest): Promise<string | null> {
  const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;
  const session = await validateSessionToken(token);
  return session?.userId ?? null;
}

export async function POST(req: NextRequest) {
  const userId = await requireUserId(req);
  if (!userId) {
    return NextResponse.json({ error: "authentication_required" }, { status: 401 });
  }

  const url = new URL(req.url);
  const offerIdParam = url.searchParams.get("offerId");
  const xPayment = req.headers.get("X-PAYMENT");

  // Phase 2: payment attached to an existing offer.
  if (offerIdParam && xPayment) {
    try {
      const result = await settleOfferAndOpen({ offerId: offerIdParam, xPaymentHeader: xPayment });
      const [rip] = await db.select().from(rips).where(eq(rips.id, result.ripId)).limit(1);
      const [proof] = await db
        .select()
        .from(fairnessProofs)
        .where(eq(fairnessProofs.ripId, result.ripId))
        .limit(1);

      const res = NextResponse.json({
        ripId: result.ripId,
        card: rip
          ? {
              name: rip.cardName,
              setName: rip.setName,
              cardNumber: rip.cardNumber,
              finish: rip.finish,
              condition: rip.condition,
              gradeLabel: rip.gradeLabel,
            }
          : null,
        fairnessProof: proof
          ? {
              serverSeedCommitment: proof.serverSeedCommitment,
              revealedServerSeed: proof.revealedServerSeed,
              clientNonce: proof.clientNonce,
              paymentIdentifier: proof.paymentIdentifier,
              chainRandomnessInput: proof.chainRandomnessInput,
              poolHash: proof.poolHash,
              combinedSeedHash: proof.combinedSeedHash,
              selectionRoll: proof.selectionRoll,
            }
          : null,
      });
      res.headers.set(
        "X-PAYMENT-RESPONSE",
        Buffer.from(JSON.stringify({ ripId: result.ripId })).toString("base64"),
      );
      return res;
    } catch (err) {
      if (err instanceof PaymentSettlementError) {
        const status = err.code === "duplicate_payment" ? 409 : 402;
        return NextResponse.json({ error: err.code, message: err.message }, { status });
      }
      throw err;
    }
  }

  // Phase 1: no payment yet — create (or reuse) an offer and return 402 + requirements.
  const body = openBodySchema.safeParse(await req.json().catch(() => ({})));
  if (!body.success) {
    return NextResponse.json(
      { error: "invalid_request", issues: body.error.issues },
      { status: 400 },
    );
  }

  try {
    const { offerId, paymentRequirements, expiresAt } = await createPackOffer({
      userId,
      tierKey: body.data.tierKey,
      chain: "algorand",
      network: body.data.network,
    });

    return NextResponse.json(
      {
        x402Version: 1,
        error: "payment_required",
        accepts: [paymentRequirements],
        offerId,
        expiresAt: expiresAt.toISOString(),
      },
      { status: 402 },
    );
  } catch (err) {
    if (err instanceof OfferCreationError) {
      return NextResponse.json({ error: err.code, message: err.message }, { status: 422 });
    }
    throw err;
  }
}

export function GET() {
  return NextResponse.json(
    {
      tiers: PACK_TIERS.map((t) => ({
        key: t.key,
        name: t.name,
        priceUsdcBaseUnits: t.priceUsdcBaseUnits,
      })),
    },
    { status: 200 },
  );
}
