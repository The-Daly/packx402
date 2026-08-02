import { cookies } from "next/headers";
import Link from "next/link";
import { SESSION_COOKIE_NAME, validateSessionToken } from "@/server/auth/session";
import { db } from "@/server/db/client";
import { rips, packOffers, packTiers } from "@/server/db/schema";
import { desc, eq } from "drizzle-orm";
import { usdcBaseUnitsToDisplayString } from "@/shared/money";
import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton";

export const revalidate = 0;

async function getMyOpenings(userId: string) {
  return db
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
    .where(eq(packOffers.userId, userId))
    .orderBy(desc(rips.openedAt));
}

/**
 * A user's own pack-opening history — deliberately scoped server-side to the
 * authenticated session's userId (see the same scoping in GET /api/packs/openings).
 * Never shows another user's openings, regardless of any `isPublic` flag on a rip (that
 * flag governs social/showcase display elsewhere, not this personal page).
 */
export default async function CollectionPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  const session = token ? await validateSessionToken(token) : null;

  if (!session) {
    return (
      <div className="mx-auto max-w-md px-6 py-16 text-center">
        <h1 className="mb-3 text-2xl font-semibold">My Openings</h1>
        <p className="text-muted mb-6 text-sm">Sign in to see your pack-opening history.</p>
        <GoogleSignInButton callbackUrl="/collection" className="bg-accent text-accent-foreground hover:bg-accent-strong mx-auto inline-block rounded-md px-6 py-3 text-sm font-semibold" />
      </div>
    );
  }

  const openings = await getMyOpenings(session.userId).catch(() => []);

  return (
    <div className="mx-auto max-w-4xl px-6 py-12">
      <h1 className="mb-2 text-2xl font-semibold">My Openings</h1>
      <p className="text-muted mb-8 text-sm">
        Every card you&apos;ve pulled, visible only to you. Each opening links to its
        independently verifiable fairness proof. Manage where cards ship in{" "}
        <Link href="/shipping-addresses" className="text-accent hover:text-accent-strong">
          shipping addresses
        </Link>
        .
      </p>

      {openings.length === 0 ? (
        <p className="border-border-subtle bg-surface text-muted rounded-lg border p-6 text-sm">
          No pack openings yet —{" "}
          <Link href="/packs" className="text-accent hover:text-accent-strong">
            browse the marketplace
          </Link>{" "}
          to open your first pack.
        </p>
      ) : (
        <div className="border-border-subtle overflow-x-auto rounded-lg border">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="bg-surface text-muted">
              <tr>
                <th className="px-4 py-3 font-medium">Card</th>
                <th className="px-4 py-3 font-medium">Set</th>
                <th className="px-4 py-3 font-medium">Pack</th>
                <th className="px-4 py-3 font-medium">Value</th>
                <th className="px-4 py-3 font-medium">Opened</th>
                <th className="px-4 py-3 font-medium">Verify</th>
              </tr>
            </thead>
            <tbody>
              {openings.map((o) => (
                <tr key={o.ripId} className="border-border-subtle border-t">
                  <td className="px-4 py-3">
                    {o.cardName}
                    {o.kind === "bonus_flip" && (
                      <span className="text-accent ml-2 text-xs font-semibold">Bonus flip</span>
                    )}
                  </td>
                  <td className="text-muted px-4 py-3">{o.setName}</td>
                  <td className="text-muted px-4 py-3">{o.tierName}</td>
                  <td className="px-4 py-3">
                    {o.referenceValueUsdcBaseUnits != null
                      ? `$${usdcBaseUnitsToDisplayString(o.referenceValueUsdcBaseUnits)}`
                      : "—"}
                  </td>
                  <td className="text-muted px-4 py-3">
                    {new Date(o.openedAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/fairness?ripId=${o.ripId}`}
                      className="text-accent hover:text-accent-strong"
                    >
                      Verify
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
