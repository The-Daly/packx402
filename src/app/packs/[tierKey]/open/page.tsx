import { notFound } from "next/navigation";
import { db } from "@/server/db/client";
import { packTiers } from "@/server/db/schema";
import { asc } from "drizzle-orm";
import { serverEnv } from "@/server/env";
import type { PackTierKey } from "@/server/config/pack-tiers";
import { OpenPackClient } from "./OpenPackClient";
import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton";

export const revalidate = 0;

async function getData(tierKey: string) {
  const allTiers = await db.select().from(packTiers).orderBy(asc(packTiers.sortOrder));
  const tier = allTiers.find((t) => t.key === tierKey);
  return { allTiers, tier };
}

export default async function OpenPackPage({ params }: { params: Promise<{ tierKey: string }> }) {
  const { tierKey } = await params;
  const { allTiers, tier } = await getData(tierKey).catch(() => ({ allTiers: [], tier: undefined }));
  if (!tier) notFound();

  const isGated = tier.requiresHighValueReleaseGate && !serverEnv.FEATURE_HIGH_VALUE_PACKS_ENABLED;
  const isLocked = tier.locked || isGated;

  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <OpenPackClient
        tiers={allTiers.map((t) => ({
          tierKey: t.key as PackTierKey,
          tierName: t.name,
          price: t.priceUsdcBaseUnits,
          locked: t.locked || (t.requiresHighValueReleaseGate && !serverEnv.FEATURE_HIGH_VALUE_PACKS_ENABLED),
        }))}
        initialTierKey={tier.key as PackTierKey}
        initialLocked={isLocked}
        signInSlot={<GoogleSignInButton callbackUrl={`/packs/${tier.key}/open`} className="mt-3 inline-block" />}
      />
    </div>
  );
}
