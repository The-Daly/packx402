# Google OAuth Setup

PackX402 has exactly two ways to create or access an account: **Sign in with Google**, or
a **direct wallet signature** (see `docs/DECISIONS.md` for why — no site-native
email/password, per product decision). This doc covers setting up the Google side.

The code (`src/server/auth/google-oauth.ts`) is already implemented against Auth.js
(NextAuth v5)'s documented Google provider. It has not been exercised against a real
Google Cloud project in this environment — no credentials were available. Follow these
steps to create real ones.

## 1. Create a Google Cloud project (skip if you already have one)

1. Go to <https://console.cloud.google.com/>.
2. Top-left project dropdown → **New Project**.
3. Name it (e.g. "PackX402"), click **Create**.

## 2. Configure the OAuth consent screen

1. In the left sidebar: **APIs & Services → OAuth consent screen**.
2. User type: **External** (unless this is an internal Google Workspace-only app).
3. Fill in the required fields: app name ("PackX402"), user support email, developer
   contact email.
4. Scopes: the default `openid`, `email`, `profile` scopes are sufficient — PackX402 does
   not request a birthdate scope (Google's birthday scope requires extra verification and
   most users don't share it anyway), which is why age/location eligibility is collected
   separately after sign-in (see `submitOAuthEligibility` in
   `src/server/auth/auth-service.ts` and the `/api/auth/oauth/complete-eligibility`
   route).
5. Add test users if the app is still in "Testing" publishing status (required before
   verification — anyone not on this list will be blocked from signing in).

## 3. Create OAuth 2.0 credentials

1. **APIs & Services → Credentials → Create Credentials → OAuth client ID**.
2. Application type: **Web application**.
3. Name it (e.g. "PackX402 web").
4. **Authorized redirect URIs** — this must exactly match where NextAuth is mounted
   (`basePath: "/api/oauth"` in `google-oauth.ts`), not the default `/api/auth` path:
   - Local dev: `http://localhost:3000/api/oauth/callback/google`
   - Production: `https://<your-domain>/api/oauth/callback/google`
5. Click **Create**. Copy the **Client ID** and **Client Secret** shown.

## 4. Set environment variables

Add to `.env.local` (never commit this file):

```bash
GOOGLE_CLIENT_ID=<the client ID from step 3>
GOOGLE_CLIENT_SECRET=<the client secret from step 3>
```

No separate `AUTH_SECRET` is needed — the NextAuth config reuses the existing
`SESSION_SECRET` env var (see `google-oauth.ts`).

## 5. Verify

Once `docker compose up -d && npm run db:migrate && npm run db:seed && npm run dev` is
running with real credentials set, visiting `/packs/<any-tier>/open` and hitting "Sign in
to open a pack" should redirect to Google's real consent screen, then back to
`/api/oauth/callback/google`, at which point `findOrCreateGoogleUser()` creates (or
finds) the PackX402 account and a normal `packx402_session` cookie is issued — the same
cookie every other route in the app already checks.

## What still needs building after this

- A UI step collecting DOB/country/terms right after first Google (or wallet) sign-in,
  calling `POST /api/auth/oauth/complete-eligibility` — the API is implemented and
  tested; there is no page for it yet.
- `createPackOffer()` already rejects any purchase attempt for a user with no passing
  eligibility record (`error: "eligibility_required"`), so the missing UI step is
  surfaced as a real, enforced block today — not a silent gap.
