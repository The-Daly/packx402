import { cookies } from "next/headers";
import { SESSION_COOKIE_NAME, validateSessionToken } from "@/server/auth/session";
import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton";
import { ShippingAddressManager } from "@/components/shipping/ShippingAddressManager";

export const revalidate = 0;

/**
 * Where a user manages the address(es) their pulled cards ship to — the piece the
 * supplier-purchase worker (src/server/suppliers/purchase-worker.ts) needs on file
 * before it can complete a real purchase (it fails clearly with
 * `no_shipping_address_on_file` otherwise).
 */
export default async function ShippingAddressesPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  const session = token ? await validateSessionToken(token) : null;

  if (!session) {
    return (
      <div className="mx-auto max-w-md px-6 py-16 text-center">
        <h1 className="mb-3 text-2xl font-semibold">Sign in to continue</h1>
        <p className="text-muted mb-6 text-sm">
          Shipping addresses are tied to your account.
        </p>
        <GoogleSignInButton
          callbackUrl="/shipping-addresses"
          className="bg-accent text-accent-foreground hover:bg-accent-strong mx-auto inline-block rounded-md px-6 py-3 text-sm font-semibold"
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg px-6 py-16">
      <h1 className="mb-2 text-2xl font-semibold">Shipping addresses</h1>
      <p className="text-muted mb-8 text-sm">
        Where PackX402 ships the cards you pull. Your default address is used
        automatically — no address on file means an opened pack can&apos;t be shipped yet.
      </p>
      <ShippingAddressManager />
    </div>
  );
}
