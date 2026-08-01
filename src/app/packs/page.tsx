import Link from "next/link";
import { db } from "@/server/db/client";
import { packTiers } from "@/server/db/schema";
import { asc } from "drizzle-orm";
import { usdcBaseUnitsToDisplayString } from "@/shared/money";
import { serverEnv } from "@/server/env";

export const revalidate = 60;

async function getTiers() {
  try {
    return await db.select().from(packTiers).orderBy(asc(packTiers.sortOrder));
  } catch {
    return [];
  }
}

export default async function MarketplacePage() {
  const tiers = await getTiers();
  const highValueGateEnabled = serverEnv.FEATURE_HIGH_VALUE_PACKS_ENABLED;

  return (
    <div className="mx-auto max-w-6xl px-6 py-12">
      <header className="mb-8">
        <h1 className="text-3xl font-semibold">Pack marketplace</h1>
        <p className="text-muted mt-2 max-w-2xl text-sm">
          Every tier below is server-gated by network and value: locked tiers cannot be purchased
          regardless of what a client sends, and no pack outcome is guaranteed or profit-implying.
        </p>
      </header>

      {tiers.length === 0 ? (
        <p className="border-border-subtle bg-surface text-muted rounded-lg border p-6 text-sm">
          No tiers loaded — run <code className="text-accent">npm run db:seed</code> against a local
          database (see README.md).
        </p>
      ) : (
        <ul
          className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
          aria-label="Pack tiers"
        >
          {tiers.map((tier) => {
            const isGated = tier.requiresHighValueReleaseGate && !highValueGateEnabled;
            const isLocked = tier.locked || isGated;
            return (
              <li key={tier.id}>
                <Link
                  href={`/packs/${tier.key}`}
                  className="group border-border-subtle bg-surface hover:border-accent/50 flex h-full flex-col rounded-lg border p-5 transition"
                  aria-disabled={isLocked}
                >
                  <div className="mb-4 flex items-center justify-between">
                    <span className="text-muted text-xs tracking-wide uppercase">
                      {tier.cardGames.join(" · ") || "Pokémon · Yu-Gi-Oh"}
                    </span>
                    {isLocked && (
                      <span className="border-border-subtle text-muted rounded-full border px-2 py-0.5 text-[10px] tracking-wide uppercase">
                        Locked
                      </span>
                    )}
                  </div>
                  <div className="from-surface-raised to-background mb-4 aspect-[3/4] rounded-md bg-gradient-to-br" />
                  <p className="group-hover:text-accent font-semibold">{tier.name}</p>
                  <p className="text-muted mt-1 text-sm">
                    ${usdcBaseUnitsToDisplayString(tier.priceUsdcBaseUnits)} · shipping{" "}
                    {tier.shippingTreatment === "included" ? "included" : "separate"}
                  </p>
                  <p className="text-muted mt-3 text-xs">
                    {tier.weeklyFreePackEligible
                      ? "Eligible for weekly free pack"
                      : "Not free-pack eligible"}
                  </p>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
