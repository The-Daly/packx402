import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db/client";
import { packTiers, poolEntries, poolVersions } from "@/server/db/schema";
import { and, eq, isNull } from "drizzle-orm";
import { resolveCardImages } from "@/server/card-images/resolver";

/**
 * Public, read-only preview of what a pack tier's pool could actually contain, with real
 * resolved card images — used to populate the card-reveal wheel's spin with genuine
 * possible outcomes instead of generic card-back placeholders. Never reveals which entry
 * will actually be won (that's determined server-side by the fairness engine only after
 * payment) — this is the same published-pool data already shown on the pack-detail odds
 * table, just with images attached.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ tierKey: string }> },
) {
  const { tierKey } = await params;

  const [tier] = await db.select().from(packTiers).where(eq(packTiers.key, tierKey)).limit(1);
  if (!tier) {
    return NextResponse.json({ error: "unknown_tier" }, { status: 404 });
  }

  const [pool] = await db
    .select()
    .from(poolVersions)
    .where(
      and(
        eq(poolVersions.packTierId, tier.id),
        eq(poolVersions.isPromotional, false),
        isNull(poolVersions.archivedAt),
      ),
    )
    .orderBy(poolVersions.publishedAt)
    .limit(1);

  if (!pool) {
    return NextResponse.json({ cards: [] });
  }

  const entries = await db.select().from(poolEntries).where(eq(poolEntries.poolVersionId, pool.id));

  const resolved = await resolveCardImages(
    entries.map((e) => ({
      cardGame: e.cardGame,
      cardName: e.cardName,
      setName: e.setName,
      cardNumber: e.cardNumber,
      supplierListingId: e.supplierListingId,
      supplierImageUsePermitted: false, // pool preview never uses supplier photos — see resolver.ts
      certificationNumber: null,
    })),
  );

  return NextResponse.json({
    cards: entries.map((e, i) => ({
      cardName: e.cardName,
      imageUrl: resolved[i].imageUrl,
    })),
  });
}
