import { db } from "@/server/db/client";
import { packTiers, poolVersions } from "@/server/db/schema";
import { eq } from "drizzle-orm";

export const metadata = { title: "Odds Library — PackX402" };
export const revalidate = 60;

async function getPools() {
  try {
    return await db
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
        tierName: packTiers.name,
        tierKey: packTiers.key,
      })
      .from(poolVersions)
      .innerJoin(packTiers, eq(poolVersions.packTierId, packTiers.id));
  } catch {
    return [];
  }
}

export default async function OddsLibraryPage() {
  const pools = await getPools();

  return (
    <div className="mx-auto max-w-5xl px-6 py-12">
      <h1 className="text-3xl font-semibold">Published Odds Library</h1>
      <p className="text-muted mt-3 max-w-2xl text-sm">
        Once a paid opening uses a pool version, that version becomes immutable — its published
        hashes can never change retroactively.
      </p>

      <div className="border-border-subtle mt-8 overflow-x-auto rounded-lg border">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="bg-surface text-muted">
            <tr>
              <th className="px-4 py-3 font-medium">Tier</th>
              <th className="px-4 py-3 font-medium">Version</th>
              <th className="px-4 py-3 font-medium">Cards</th>
              <th className="px-4 py-3 font-medium">Pool hash</th>
              <th className="px-4 py-3 font-medium">Odds hash</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">JSON</th>
            </tr>
          </thead>
          <tbody>
            {pools.map((p) => (
              <tr key={p.id} className="border-border-subtle border-t">
                <td className="px-4 py-3">{p.tierName}</td>
                <td className="text-muted px-4 py-3">{p.versionLabel}</td>
                <td className="text-muted px-4 py-3">{p.cardCountTotal}</td>
                <td
                  className="text-muted max-w-[140px] truncate px-4 py-3 font-mono text-xs"
                  title={p.poolHash}
                >
                  {p.poolHash}
                </td>
                <td
                  className="text-muted max-w-[140px] truncate px-4 py-3 font-mono text-xs"
                  title={p.oddsHash}
                >
                  {p.oddsHash}
                </td>
                <td className="text-muted px-4 py-3">
                  {p.archivedAt ? "Archived" : p.isImmutable ? "Immutable" : "Active"}
                </td>
                <td className="px-4 py-3">
                  <a href={`/api/odds/${p.id}`} className="text-accent hover:text-accent-strong">
                    Download JSON
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {pools.length === 0 && (
          <p className="text-muted p-6 text-sm">No pool versions published yet.</p>
        )}
      </div>
    </div>
  );
}
