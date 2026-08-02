import { cookies } from "next/headers";
import { SESSION_COOKIE_NAME, validateSessionToken } from "@/server/auth/session";
import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton";
import { EligibilityForm } from "@/components/auth/EligibilityForm";

export const revalidate = 0;

/**
 * Collects the DOB/country/18+ acknowledgment that neither Google sign-in nor a wallet
 * signature captures at account-creation time (see submitOAuthEligibility in
 * auth-service.ts and the "eligibility_required" rejection in offer-service.ts's
 * createPackOffer). Linked to from anywhere a pack-offer creation fails with that error.
 */
export default async function EligibilityPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  const session = token ? await validateSessionToken(token) : null;

  if (!session) {
    return (
      <div className="mx-auto max-w-md px-6 py-16 text-center">
        <h1 className="mb-3 text-2xl font-semibold">Sign in to continue</h1>
        <p className="text-muted mb-6 text-sm">
          Sign in first — eligibility is tied to your account.
        </p>
        <GoogleSignInButton
          callbackUrl="/eligibility"
          className="bg-accent text-accent-foreground hover:bg-accent-strong mx-auto inline-block rounded-md px-6 py-3 text-sm font-semibold"
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md px-6 py-16">
      <h1 className="mb-2 text-center text-2xl font-semibold">Before you open a pack</h1>
      <p className="text-muted mb-8 text-center text-sm">
        PackX402 requires everyone to confirm they&apos;re 18+ and tell us where they&apos;re
        purchasing from — this only takes a moment.
      </p>
      <EligibilityForm />
    </div>
  );
}
