import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { cookies, headers } from "next/headers";
import { serverEnv } from "@/server/env";
import { findOrCreateGoogleUser, createSessionForGoogleUser } from "./auth-service";
import { SESSION_COOKIE_NAME, sessionCookieOptions } from "./session";

/**
 * Google sign-in only (per product decision: the only two ways into a PackX402 account
 * are "Sign in with Google" and a direct wallet signature — no site-native
 * email/password). Mounted at /api/oauth/[...nextauth], deliberately NOT /api/auth/*,
 * which is reserved for our existing wallet/session route handlers — the two auth
 * systems never overlap on path or on which cookie they read.
 *
 * NextAuth here is used ONLY for the OAuth2 handshake with Google (state/PKCE/code
 * exchange/ID-token verification) — it is not the app's session system. On a successful
 * Google sign-in, the `signIn` callback below finds-or-creates the corresponding
 * PackX402 user and issues our own `packx402_session` cookie via createSession(),
 * exactly like a wallet login. Every other route in the app (requireUserId, session
 * listing/revocation, responsible-purchasing checks) keeps checking only that cookie —
 * NextAuth's own session cookie is set alongside but never read by app code.
 */
export const { handlers, signIn: nextAuthSignIn } = NextAuth({
  basePath: "/api/oauth",
  secret: serverEnv.SESSION_SECRET,
  session: { strategy: "jwt" },
  providers: [
    Google({
      clientId: serverEnv.GOOGLE_CLIENT_ID,
      clientSecret: serverEnv.GOOGLE_CLIENT_SECRET,
    }),
  ],
  callbacks: {
    async signIn({ user, profile }) {
      const googleId = profile?.sub;
      const email = profile?.email ?? user.email;
      if (!googleId || !email) return false;

      const { userId } = await findOrCreateGoogleUser({
        providerAccountId: googleId,
        email,
        displayName: profile?.name ?? user.name ?? "",
      });

      const requestHeaders = await headers();
      const session = await createSessionForGoogleUser(userId, {
        userAgent: requestHeaders.get("user-agent") ?? undefined,
      });

      const cookieStore = await cookies();
      cookieStore.set(
        SESSION_COOKIE_NAME,
        session.token,
        sessionCookieOptions(session.expiresAt),
      );

      return true;
    },
  },
});
