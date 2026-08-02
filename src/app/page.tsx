import Link from "next/link";
import { db } from "@/server/db/client";
import { packTiers } from "@/server/db/schema";
import { asc, eq } from "drizzle-orm";
import { FeaturedPacksCarousel } from "./FeaturedPacksCarousel";
import { InteractivePackDemo } from "@/components/pack-art/InteractivePackDemo";
import type { PackTierKey } from "@/server/config/pack-tiers";

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

      <section className="border-border-subtle from-background via-surface to-background border-b bg-gradient-to-b">
        <div className="mx-auto max-w-6xl px-6 py-16">
          <div className="mb-10 text-center">
            <p className="text-accent mb-3 text-sm font-semibold tracking-[0.3em] uppercase">
              Try it right now
            </p>
            <h2 className="text-3xl font-semibold tracking-tight">Rip a pack. No wallet needed.</h2>
            <p className="text-muted mx-auto mt-3 max-w-xl">
              This is the exact drag-to-rip, spin, and reveal sequence every real pack goes
              through — just without a real card on the other end.
            </p>
          </div>

          <div className="grid gap-12 lg:grid-cols-2 lg:items-start">
            <InteractivePackDemo />

            <div>
              <h3 className="mb-6 text-xl font-semibold">How the algorithm decides your card</h3>
              <ol className="space-y-5">
                <AlgorithmStep
                  number="1"
                  title="Before you pay"
                  body="PackX402 generates a secret server seed and publishes only its hash — a commitment. It cannot be changed after this point without the hash no longer matching."
                  code="commitment = sha256(serverSeed)"
                />
                <AlgorithmStep
                  number="2"
                  title="You pay"
                  body="Your payment settles on-chain, producing a payment identifier and a piece of post-settlement chain randomness nobody — including PackX402 — could have predicted beforehand."
                  code='chainRandomness = block.seed'
                />
                <AlgorithmStep
                  number="3"
                  title="The seed is revealed"
                  body="PackX402 publishes the server seed. Combined with your payment identifier, the chain randomness, and the pool hash, one sha256 hash determines your card."
                  code="roll = sha256(seed | nonce | payment | chainRandom | poolHash)"
                />
                <AlgorithmStep
                  number="4"
                  title="Anyone can verify"
                  body="Recompute the same hash yourself, or use the verifier — it will select the exact same card, every time, for anyone."
                  code="verify(proof) === true"
                />
              </ol>
              <Link
                href="/fairness"
                className="text-accent hover:text-accent-strong mt-6 inline-block text-sm font-semibold"
              >
                Full technical breakdown →
              </Link>
            </div>
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
          <FeaturedPacksCarousel
            items={featured.map((tier) => ({
              tierKey: tier.key as PackTierKey,
              tierName: tier.name,
              price: tier.priceUsdcBaseUnits,
              locked: tier.locked,
            }))}
          />
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

function AlgorithmStep({
  number,
  title,
  body,
  code,
}: {
  number: string;
  title: string;
  body: string;
  code: string;
}) {
  return (
    <li className="flex gap-4">
      <span className="border-accent/40 bg-surface text-accent flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-sm font-bold">
        {number}
      </span>
      <div>
        <p className="font-semibold">{title}</p>
        <p className="text-muted mt-1 text-sm">{body}</p>
        <code className="border-border-subtle bg-surface text-accent mt-2 inline-block rounded-md border px-2 py-1 text-xs">
          {code}
        </code>
      </div>
    </li>
  );
}
