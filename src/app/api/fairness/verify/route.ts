import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { verifySelection } from "@/server/fairness/engine";
import { db } from "@/server/db/client";
import { fairnessProofs, poolEntries } from "@/server/db/schema";
import { eq } from "drizzle-orm";

const bodySchema = z.object({
  ripId: z.string().uuid(),
});

/**
 * Public fairness verifier (spec section 18). Looks up the published proof bundle for a
 * rip and independently recomputes the selection from first principles, returning both
 * the stored claim and the recomputation so a caller can compare them directly rather
 * than trusting a single "valid: true/false" flag.
 */
export async function POST(req: NextRequest) {
  const parsed = bodySchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  const [proof] = await db
    .select()
    .from(fairnessProofs)
    .where(eq(fairnessProofs.ripId, parsed.data.ripId))
    .limit(1);
  if (!proof) {
    return NextResponse.json({ error: "proof_not_found" }, { status: 404 });
  }

  const entries = await db
    .select({ id: poolEntries.id, weight: poolEntries.weight })
    .from(poolEntries)
    .where(eq(poolEntries.poolVersionId, proof.poolVersionId));

  const verdict = verifySelection({
    serverSeedCommitment: proof.serverSeedCommitment,
    revealedServerSeed: proof.revealedServerSeed,
    clientNonce: proof.clientNonce,
    paymentIdentifier: proof.paymentIdentifier,
    chainRandomnessInput: proof.chainRandomnessInput,
    poolHash: proof.poolHash,
    entries,
    claimedCombinedSeedHash: proof.combinedSeedHash,
    claimedSelectionRoll: proof.selectionRoll,
    claimedSelectedEntryId: proof.selectedPoolEntryId,
  });

  return NextResponse.json({
    ripId: parsed.data.ripId,
    valid: verdict.valid,
    failures: verdict.failures,
    proof: {
      poolHash: proof.poolHash,
      oddsHash: proof.oddsHash,
      serverSeedCommitment: proof.serverSeedCommitment,
      revealedServerSeed: proof.revealedServerSeed,
      clientNonce: proof.clientNonce,
      paymentIdentifier: proof.paymentIdentifier,
      chainRandomnessInput: proof.chainRandomnessInput,
      combinedSeedHash: proof.combinedSeedHash,
      selectionRoll: proof.selectionRoll,
      algorithmVersion: proof.algorithmVersion,
    },
  });
}
