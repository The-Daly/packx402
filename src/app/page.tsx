import Link from "next/link";
import { db } from "@/server/db/client";
import { packTiers } from "@/server/db/schema";
import { asc, eq } from "drizzle-orm";
import { usdcBaseUnitsToDisplayString } from "@/shared/money";

export const revalidate = 60;

async function getFeaturedTiers() {
  try {
    return await db
      .select()
      .from(packTiers)
      .where(eq(packTiers.locked, false))
      .orderBy(asc(packTiers.sortOrder))
      .limit(4);
  } catch {
    // DB not reachable (e.g. this page rendered before `docker compose up` + seed).
    return [];
  }
}

export default async function HomePage() {
  const featured = await getFeaturedTiers();

  return (
    <div>
      <section className="border-border-subtle from-surface to-background border-b bg-gradient-to-b">
        <div className="mx-auto max-w-6xl px-6 py-20 text-center">
          <p className="text-accent mb-4 text-sm font-medium tracking-[0.3em] uppercase">
            Supplier-backed · Provably fair · Wallet-native
          </p>
          <h1 className="mx-auto max-w-3xl text-4xl font-semibold tracking-tight sm:text-5xl">
            Open. Verify. Collect.
          </h1>
          <p className="text-muted mx-auto mt-5 max-w-2xl text-lg">
            PackX402 pairs Algorand x402 payments with a cryptographically provable pack-opening
            engine. Every card is sourced from approved supplier inventory and shipped directly to
            you — PackX402 never warehouses cards during beta.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/packs"
              className="bg-accent text-accent-foreground hover:bg-accent-strong rounded-md px-6 py-3 text-sm font-semibold"
            >
              Browse the marketplace
            </Link>
            <Link
              href="/fairness"
              className="border-border-subtle hover:border-accent/50 rounded-md border px-6 py-3 text-sm font-semibold"
            >
              How fairness works
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-16">
        <div className="mb-8 flex items-end justify-between">
          <h2 className="text-2xl font-semibold">Featured pack tiers</h2>
          <Link href="/packs" className="text-accent hover:text-accent-strong text-sm">
            View all tiers →
          </Link>
        </div>
        {featured.length === 0 ? (
          <p className="border-border-subtle bg-surface text-muted rounded-lg border p-6 text-sm">
            Pack catalog is not loaded yet — run{" "}
            <code className="text-accent">docker compose up -d</code>,{" "}
            <code className="text-accent">npm run db:migrate</code>, and{" "}
            <code className="text-accent">npm run db:seed</code> to populate tiers.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {featured.map((tier) => (
              <Link
                key={tier.id}
                href={`/packs/${tier.key}`}
                className="group border-border-subtle bg-surface hover:border-accent/50 rounded-lg border p-5 transition"
              >
                <div className="from-surface-raised to-background mb-4 aspect-[3/4] rounded-md bg-gradient-to-br" />
                <p className="group-hover:text-accent font-semibold">{tier.name}</p>
                <p className="text-muted text-sm">
                  ${usdcBaseUnitsToDisplayString(tier.priceUsdcBaseUnits)}
                </p>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className="border-border-subtle bg-surface border-y">
        <div className="mx-auto grid max-w-6xl gap-8 px-6 py-16 md:grid-cols-3">
          <InfoCard
            title="Supplier-backed fulfillment"
            body="Every eligible card comes from approved supplier inventory, verified for stock and condition before it ever enters a pool. Cards ship directly from the supplier to you."
          />
          <InfoCard
            title="Provably fair openings"
            body="Before you pay, PackX402 commits to a server seed and publishes the pool's cryptographic hash. After payment, the seed is revealed and the selection is independently reproducible by anyone."
          />
          <InfoCard
            title="Supported wallets"
            body="Connect Pera or Defly for Algorand, or Phantom for Solana and EVM. PackX402 never stores your private keys or seed phrases."
          />
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-16">
        <div className="border-border-subtle bg-surface rounded-lg border p-8">
          <h2 className="text-xl font-semibold">Responsible purchasing</h2>
          <p className="text-muted mt-3 max-w-2xl text-sm">
            Packs are randomized physical products. Card values can change and are not guaranteed —
            PackX402 is not an investment platform. Set daily, weekly, and monthly purchase limits,
            or pause your account any time in your{" "}
            <Link href="/responsible-purchasing" className="text-accent hover:text-accent-strong">
              Responsible Purchasing controls
            </Link>
            .
          </p>
        </div>
      </section>
    </div>
  );
}

function InfoCard({ title, body }: { title: string; body: string }) {
  return (
    <div>
      <h3 className="text-accent mb-2 font-semibold">{title}</h3>
      <p className="text-muted text-sm">{body}</p>
    </div>
  );
}
