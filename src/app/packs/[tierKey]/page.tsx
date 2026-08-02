import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/server/db/client";
import { packTiers, poolEntries, poolVersions } from "@/server/db/schema";
import { and, eq, isNull } from "drizzle-orm";
import { usdcBaseUnitsToDisplayString } from "@/shared/money";
import { serverEnv } from "@/server/env";
import { PackArt } from "@/components/pack-art/PackArt";
import type { PackTierKey } from "@/server/config/pack-tiers";

export const revalidate = 30;

async function getTierData(tierKey: string) {
  const [tier] = await db.select().from(packTiers).where(eq(packTiers.key, tierKey)).limit(1);
  if (!tier) return null;

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

  const entries = pool
    ? await db.select().from(poolEntries).where(eq(poolEntries.poolVersionId, pool.id))
    : [];

  return { tier, pool, entries };
}

export default async function PackDetailPage({ params }: { params: Promise<{ tierKey: string }> }) {
  const { tierKey } = await params;
  const data = await getTierData(tierKey).catch(() => null);
  if (!data || !data.tier) notFound();

  const { tier, pool, entries } = data;
  const isGated = tier.requiresHighValueReleaseGate && !serverEnv.FEATURE_HIGH_VALUE_PACKS_ENABLED;
  const isLocked = tier.locked || isGated;

  return (
    <div className="mx-auto max-w-5xl px-6 py-12">
      <div className="grid gap-10 md:grid-cols-2">
        <div>
          <PackArt
            tierKey={tier.key as PackTierKey}
            tierName={tier.name}
            price={tier.priceUsdcBaseUnits}
            locked={isLocked}
            size="detail"
            priority
            featured
          />
        </div>
        <div>
          <h1 className="text-3xl font-semibold">{tier.name} Pack</h1>
          <p className="text-accent mt-2 text-2xl">
            ${usdcBaseUnitsToDisplayString(tier.priceUsdcBaseUnits)}{" "}
            <span className="text-muted text-sm">USDC</span>
          </p>

          <dl className="mt-6 grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
            <dt className="text-muted">Shipping</dt>
            <dd>
              {tier.shippingTreatment === "included"
                ? "Included"
                : `~$${usdcBaseUnitsToDisplayString(tier.estimatedShippingUsdcBaseUnits)} estimated`}
            </dd>
            <dt className="text-muted">Card categories</dt>
            <dd>{tier.cardGames.join(", ") || "Pokémon, Yu-Gi-Oh"}</dd>
            <dt className="text-muted">Minimum condition</dt>
            <dd className="capitalize">{tier.minDisclosedCondition.replaceAll("_", " ")}</dd>
            <dt className="text-muted">Pool version</dt>
            <dd>{pool ? pool.versionLabel : "Not yet published"}</dd>
            <dt className="text-muted">Published</dt>
            <dd>{pool ? new Date(pool.publishedAt).toLocaleDateString() : "—"}</dd>
            <dt className="text-muted">Estimated delivery</dt>
            <dd>7–14 business days after supplier confirmation</dd>
          </dl>

          {isLocked ? (
            <div className="border-border-subtle bg-surface text-muted mt-8 rounded-md border p-4 text-sm">
              This tier is currently locked during beta
              {isGated
                ? " pending legal, inventory, financial, security, and responsible-purchasing release review"
                : ""}
              . It cannot be purchased regardless of client state — this is enforced server-side.
            </div>
          ) : (
            <Link
              href={`/packs/${tier.key}/open`}
              className="bg-accent text-accent-foreground hover:bg-accent-strong mt-8 inline-block rounded-md px-6 py-3 text-sm font-semibold"
            >
              Open Pack
            </Link>
          )}

          <p className="text-muted mt-4 text-xs">
            No profit is guaranteed. Reference values are market estimates, not resale guarantees.{" "}
            <Link href="/fairness" className="text-accent hover:text-accent-strong">
              How fairness works
            </Link>
            {" · "}
            <Link href="/legal/pack-rules" className="text-accent hover:text-accent-strong">
              Pack rules
            </Link>
          </p>
        </div>
      </div>

      <section className="mt-14">
        <h2 className="mb-4 text-xl font-semibold">Published probability bands</h2>
        {entries.length === 0 ? (
          <p className="text-muted text-sm">Pool not yet published for this tier.</p>
        ) : (
          <div className="border-border-subtle overflow-x-auto rounded-lg border">
            <table className="w-full min-w-[480px] text-left text-sm">
              <thead className="bg-surface text-muted">
                <tr>
                  <th className="px-4 py-3 font-medium">Example card</th>
                  <th className="px-4 py-3 font-medium">Set</th>
                  <th className="px-4 py-3 font-medium">Condition</th>
                  <th className="px-4 py-3 font-medium">Probability band</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((e) => (
                  <tr key={e.id} className="border-border-subtle border-t">
                    <td className="px-4 py-3">{e.cardName}</td>
                    <td className="text-muted px-4 py-3">{e.setName}</td>
                    <td className="text-muted px-4 py-3 capitalize">
                      {e.minCondition.replaceAll("_", " ")}+
                    </td>
                    <td className="px-4 py-3">{e.probabilityBandLabel}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="border-border-subtle bg-surface mt-14 rounded-lg border p-6">
        <h2 className="mb-2 text-lg font-semibold">Supplier fulfillment</h2>
        <p className="text-muted text-sm">
          The card you receive is sourced from approved supplier inventory at the moment of purchase
          and shipped directly from the supplier to your verified address. If the selected listing
          becomes unavailable before purchase, PackX402 follows a documented substitution process —
          see{" "}
          <Link href="/support" className="text-accent hover:text-accent-strong">
            refund &amp; unavailable-listing procedure
          </Link>
          .
        </p>
      </section>
    </div>
  );
}
