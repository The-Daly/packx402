import { NextRequest, NextResponse } from "next/server";
import { validateSessionToken, SESSION_COOKIE_NAME } from "@/server/auth/session";
import { db } from "@/server/db/client";
import { rips, packOffers, packTiers } from "@/server/db/schema";
import { desc, eq } from "drizzle-orm";

/**
 * A user's own pack-opening history — deliberately scoped to `packOffers.userId` matching
 * the authenticated session, never a global/cross-user listing. This is distinct from
 * `/api/fairness/verify`, which stays intentionally public-by-ripId: that endpoint proves
 * a specific already-known rip's fairness to any third party (the whole point of
 * "provably fair"), while this endpoint is what would let a rip's owner discover their
 * own past ripIds in the first place. No one else's opening history is ever exposed here,
 * including for rips marked `isPublic` (that flag governs social/showcase display
 * elsewhere, not this personal history feed).
 */
export async function GET(req: NextRequest) {
  const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!token) {
    return NextResponse.json({ error: "authentication_required" }, { status: 401 });
  }
  const session = await validateSessionToken(token);
  if (!session) {
    return NextResponse.json({ error: "authentication_required" }, { status: 401 });
  }

  const rows = await db
    .select({
      ripId: rips.id,
      kind: rips.kind,
      cardName: rips.cardName,
      setName: rips.setName,
      cardNumber: rips.cardNumber,
      finish: rips.finish,
      condition: rips.condition,
      referenceValueUsdcBaseUnits: rips.referenceValueUsdcBaseUnits,
      openedAt: rips.openedAt,
      tierKey: packTiers.key,
      tierName: packTiers.name,
    })
    .from(rips)
    .innerJoin(packOffers, eq(packOffers.id, rips.packOfferId))
    .innerJoin(packTiers, eq(packTiers.id, packOffers.packTierId))
    .where(eq(packOffers.userId, session.userId))
    .orderBy(desc(rips.openedAt));

  return NextResponse.json({ openings: rows });
}
