"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

/**
 * Checks auth state client-side via GET /api/auth/session after mount, rather than in the
 * root layout via cookies() — that would force every page in the app to render
 * dynamically (no static generation at all) just for a header link/button. Trades a brief
 * flash of the signed-out state on first paint for keeping the rest of the site statically
 * generated.
 */
function useAuthenticated(): boolean {
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/auth/session")
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled) setAuthenticated(Boolean(data.authenticated));
      })
      .catch(() => {
        // Network error — stay in the signed-out default rather than block the header.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return authenticated;
}

/** "My Openings" nav link, shown only once signed in. */
export function AuthAwareNavLink() {
  const authenticated = useAuthenticated();
  if (!authenticated) return null;
  return (
    <Link href="/collection" className="hover:text-foreground">
      My Openings
    </Link>
  );
}

export interface AuthAwareHeaderActionsProps {
  /** Rendered once we know the visitor is signed out — a Server Component
   * (GoogleSignInButton uses a server action), so it's passed down as a slot rather than
   * imported here. */
  signedOutSlot: React.ReactNode;
  /** Rendered once we know the visitor is signed in. */
  signedInSlot: React.ReactNode;
}

/** The header's right-side sign-in/sign-out action. */
export function AuthAwareHeaderActions({
  signedOutSlot,
  signedInSlot,
}: AuthAwareHeaderActionsProps) {
  const authenticated = useAuthenticated();
  return <>{authenticated ? signedInSlot : signedOutSlot}</>;
}
