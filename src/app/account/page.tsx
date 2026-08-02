import Link from "next/link";
import { cookies } from "next/headers";
import { SESSION_COOKIE_NAME, validateSessionToken } from "@/server/auth/session";
import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton";
import { SessionsManager } from "@/components/auth/SessionsManager";
import { ConnectedWalletsList } from "@/components/wallet/ConnectedWalletsList";

export const revalidate = 0;

/**
 * The wallet-center/account hub the roadmap calls for (Phase 1, item 2) — connected
 * wallets (read-only; see ConnectedWalletsList's note on why linking an additional wallet
 * isn't wired up yet), active sessions with a sign-out-everywhere control, and links to
 * the other account-scoped pages (shipping addresses, eligibility, opening history).
 */
export default async function AccountPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  const session = token ? await validateSessionToken(token) : null;

  if (!session) {
    return (
      <div className="mx-auto max-w-md px-6 py-16 text-center">
        <h1 className="mb-3 text-2xl font-semibold">Sign in to continue</h1>
        <p className="text-muted mb-6 text-sm">Your account details are tied to your session.</p>
        <GoogleSignInButton
          callbackUrl="/account"
          className="bg-accent text-accent-foreground hover:bg-accent-strong mx-auto inline-block rounded-md px-6 py-3 text-sm font-semibold"
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg space-y-10 px-6 py-16">
      <div>
        <h1 className="mb-2 text-2xl font-semibold">Account</h1>
        <p className="text-muted text-sm">
          <Link href="/collection" className="text-accent hover:text-accent-strong">
            My Openings
          </Link>
          {" · "}
          <Link href="/shipping-addresses" className="text-accent hover:text-accent-strong">
            Shipping addresses
          </Link>
          {" · "}
          <Link href="/eligibility" className="text-accent hover:text-accent-strong">
            Eligibility
          </Link>
          {" · "}
          <Link href="/responsible-purchasing" className="text-accent hover:text-accent-strong">
            Responsible purchasing
          </Link>
        </p>
      </div>

      <section>
        <h2 className="mb-3 text-lg font-semibold">Connected wallets</h2>
        <ConnectedWalletsList />
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold">Active sessions</h2>
        <SessionsManager />
      </section>
    </div>
  );
}
