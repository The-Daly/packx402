import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db/client";
import { packTiers, poolEntries, poolVersions } from "@/server/db/schema";
import { eq } from "drizzle-orm";

/**
 * Machine-readable odds JSON download (spec section 19).
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ poolVersionId: string }> },
) {
  const { poolVersionId } = await params;

  const [pool] = await db
    .select({
      id: poolVersions.id,
      versionLabel: poolVersions.versionLabel,
      poolHash: poolVersions.poolHash,
      oddsHash: poolVersions.oddsHash,
      totalWeight: poolVersions.totalWeight,
      cardCountTotal: poolVersions.cardCountTotal,
      publishedAt: poolVersions.publishedAt,
      archivedAt: poolVersions.archivedAt,
      isImmutable: poolVersions.isImmutable,
      isPromotional: poolVersions.isPromotional,
      tierName: packTiers.name,
      tierKey: packTiers.key,
    })
    .from(poolVersions)
    .innerJoin(packTiers, eq(poolVersions.packTierId, packTiers.id))
    .where(eq(poolVersions.id, poolVersionId))
    .limit(1);

  if (!pool) {
    return NextResponse.json({ error: "pool_not_found" }, { status: 404 });
  }

  const entries = await db
    .select({
      id: poolEntries.id,
      cardGame: poolEntries.cardGame,
      cardName: poolEntries.cardName,
      setName: poolEntries.setName,
      cardNumber: poolEntries.cardNumber,
      finish: poolEntries.finish,
      minCondition: poolEntries.minCondition,
      weight: poolEntries.weight,
      probabilityBandLabel: poolEntries.probabilityBandLabel,
    })
    .from(poolEntries)
    .where(eq(poolEntries.poolVersionId, poolVersionId));

  const body = JSON.stringify({ pool, entries }, null, 2);
  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="packx402-odds-${pool.tierKey}-${pool.versionLabel}.json"`,
    },
  });
}
