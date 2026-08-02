import { nextAuthSignIn } from "@/server/auth/google-oauth";

export interface GoogleSignInButtonProps {
  callbackUrl?: string;
  className?: string;
}

/**
 * Server-action sign-in trigger — the recommended Auth.js v5 App Router pattern. Calls
 * our own exported `signIn` (bound to the Google-only config in google-oauth.ts, mounted
 * at /api/oauth), not the next-auth/react client hooks, so there's no basePath mismatch
 * to keep in sync. This is one of exactly two ways into a PackX402 account — the other is
 * a direct wallet signature (see src/server/auth/auth-service.ts's completeWalletAuth).
 */
export function GoogleSignInButton({ callbackUrl, className }: GoogleSignInButtonProps) {
  return (
    <form
      action={async () => {
        "use server";
        await nextAuthSignIn("google", { redirectTo: callbackUrl ?? "/" });
      }}
    >
      <button
        type="submit"
        className={
          className ??
          "border-border-subtle hover:border-accent/50 flex items-center justify-center gap-2 rounded-md border px-6 py-3 text-sm font-semibold"
        }
      >
        Sign in with Google
      </button>
    </form>
  );
}
