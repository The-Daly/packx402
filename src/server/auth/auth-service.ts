import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/server/db/client";
import {
  authNonces,
  eligibilityRecords,
  oauthIdentities,
  userProfiles,
  users,
  walletIdentities,
} from "@/server/db/schema";
import { evaluateEligibility } from "@/server/eligibility/policy";
import {
  CURRENT_OFFICIAL_PACK_RULES_VERSION,
  CURRENT_PRIVACY_VERSION,
  CURRENT_RESPONSIBLE_PURCHASING_VERSION,
  CURRENT_TERMS_VERSION,
} from "@/server/config/policy-versions";
import { generateOpaqueToken } from "./tokens";
import { createSession, type CreateSessionParams } from "./session";
import {
  buildWalletSignatureMessage,
  parseWalletSignatureMessage,
  type WalletSignaturePayload,
} from "./wallet-message";
import { verifyWalletSignature } from "./wallet-verify";

const NONCE_TTL_MS = 5 * 60 * 1000; // 5 minutes

export class AuthError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

/**
 * Finds the PackX402 user linked to this Google account (by provider + Google's stable
 * `sub` claim, never by email alone — an email can be reused/changed), or creates a new
 * account on first sign-in. Mirrors the wallet-first-signup pattern in
 * `completeWalletAuth()` below, including the same known gap: this does not yet collect
 * DOB/location eligibility (Google's basic profile scope has no birthdate), so a new
 * account is created eligibility-incomplete and MUST complete `submitOAuthEligibility`
 * below before any pack offer can be created — see the check in `createPackOffer()`.
 */
export async function findOrCreateGoogleUser(params: {
  providerAccountId: string;
  email: string;
  displayName: string;
}): Promise<{ userId: string; isNewAccount: boolean }> {
  const [existingIdentity] = await db
    .select({ userId: oauthIdentities.userId })
    .from(oauthIdentities)
    .where(
      and(
        eq(oauthIdentities.provider, "google"),
        eq(oauthIdentities.providerAccountId, params.providerAccountId),
      ),
    )
    .limit(1);

  if (existingIdentity) {
    return { userId: existingIdentity.userId, isNewAccount: false };
  }

  const suffix = generateOpaqueToken(4)
    .replace(/[^a-zA-Z0-9]/g, "")
    .slice(0, 6);
  const [user] = await db
    .insert(users)
    .values({
      email: params.email,
      username: `collector-${suffix}`,
      primaryAuthMethod: "google",
      emailVerifiedAt: new Date(), // Google has already verified this address
      marketingConsent: false,
      termsAcceptedVersion: CURRENT_TERMS_VERSION,
      termsAcceptedAt: new Date(),
      privacyAcceptedVersion: CURRENT_PRIVACY_VERSION,
      responsiblePurchasingAcceptedVersion: CURRENT_RESPONSIBLE_PURCHASING_VERSION,
      officialPackRulesAcceptedVersion: CURRENT_OFFICIAL_PACK_RULES_VERSION,
      country: "US", // placeholder until submitOAuthEligibility() records the real value
    })
    .returning({ id: users.id });

  await db
    .insert(userProfiles)
    .values({ userId: user.id, displayName: params.displayName || `Collector ${suffix}` });
  await db.insert(oauthIdentities).values({
    userId: user.id,
    provider: "google",
    providerAccountId: params.providerAccountId,
    email: params.email,
    verifiedAt: new Date(),
  });

  return { userId: user.id, isNewAccount: true };
}

/**
 * Issues our own app session for an already-resolved Google-authenticated user. Called
 * right after `findOrCreateGoogleUser()` from the NextAuth signIn callback — NextAuth
 * itself only handles the OAuth2 handshake with Google; this is what the rest of the app
 * (requireUserId, session listing/revocation, responsible-purchasing limits) actually
 * checks, exactly like a wallet-authenticated session.
 */
export async function createSessionForGoogleUser(
  userId: string,
  sessionParams: Omit<CreateSessionParams, "userId" | "authMethod">,
): Promise<{ token: string; expiresAt: Date }> {
  return createSession({ userId, authMethod: "google", ...sessionParams });
}

/**
 * Completes the DOB/location eligibility gate for an account created via Google or
 * wallet sign-in (neither collects this at signup time). A pack offer cannot be created
 * for a user until this has been called at least once and passed — see the check added
 * to `createPackOffer()` in offer-service.ts.
 */
export async function submitOAuthEligibility(params: {
  userId: string;
  dateOfBirth: string;
  ageAcknowledged18Plus: boolean;
  country: string;
  stateOrProvince?: string;
  sessionCorrelationId: string;
}): Promise<{ eligible: boolean; reasons: string[] }> {
  const eligibility = evaluateEligibility({
    dateOfBirth: params.dateOfBirth,
    ageAcknowledged18Plus: params.ageAcknowledged18Plus,
    country: params.country,
    stateOrProvince: params.stateOrProvince,
    now: new Date(),
  });

  await db.insert(eligibilityRecords).values({
    userId: params.userId,
    sessionCorrelationId: params.sessionCorrelationId,
    dateOfBirth: params.dateOfBirth,
    ageAcknowledged18Plus: params.ageAcknowledged18Plus,
    locationCountry: params.country,
    locationStateOrProvince: params.stateOrProvince,
    locationAllowed:
      eligibility.eligible || !eligibility.reasons.includes("location_blocked_country"),
    policyVersion: eligibility.policyVersion,
  });

  if (params.country) {
    await db.update(users).set({ country: params.country }).where(eq(users.id, params.userId));
  }

  return { eligible: eligibility.eligible, reasons: eligibility.reasons };
}

export async function createWalletNonce(params: {
  chain: WalletSignaturePayload["chain"];
  address: string;
  domain: string;
  uri: string;
  purpose: "login" | "wallet_link";
}): Promise<{ message: string; nonce: string }> {
  const nonce = generateOpaqueToken(16);
  const issuedAt = new Date();
  const expiresAt = new Date(issuedAt.getTime() + NONCE_TTL_MS);

  await db.insert(authNonces).values({
    nonce,
    chain: params.chain,
    address: params.address,
    domain: params.domain,
    uri: params.uri,
    purpose: params.purpose,
    issuedAt,
    expiresAt,
  });

  const message = buildWalletSignatureMessage({
    domain: params.domain,
    address: params.address,
    chain: params.chain,
    uri: params.uri,
    purpose: params.purpose,
    nonce,
    issuedAt: issuedAt.toISOString(),
    expiresAt: expiresAt.toISOString(),
  });

  return { message, nonce };
}

export interface CompleteWalletAuthParams {
  chain: WalletSignaturePayload["chain"];
  address: string;
  signature: string;
  message: string;
  /** Present only for a "wallet_link" flow initiated by an already-authenticated user. */
  linkingUserId?: string;
  sessionParams: Omit<CreateSessionParams, "userId" | "authMethod">;
}

/**
 * Verifies a wallet-signed message against its single-use nonce, then either links the
 * wallet to an existing session (`linkingUserId` set), logs in an already-linked wallet,
 * or creates a brand-new wallet-first account. Nonces are consumed exactly once,
 * preventing replay.
 */
export async function completeWalletAuth(
  params: CompleteWalletAuthParams,
): Promise<{ token: string; expiresAt: Date; userId: string }> {
  const parsed = parseWalletSignatureMessage(params.message);
  if (parsed.address !== params.address || parsed.chain !== params.chain) {
    throw new AuthError(
      "message_mismatch",
      "Signed message does not match the claimed address/chain",
    );
  }

  const [nonceRow] = await db
    .select()
    .from(authNonces)
    .where(
      and(
        eq(authNonces.nonce, parsed.nonce),
        eq(authNonces.chain, params.chain),
        isNull(authNonces.consumedAt),
      ),
    )
    .limit(1);

  if (
    !nonceRow ||
    nonceRow.expiresAt.getTime() < Date.now() ||
    nonceRow.address !== params.address
  ) {
    throw new AuthError("invalid_nonce", "This login request is invalid or has expired");
  }

  const valid = await verifyWalletSignature({
    chain: params.chain,
    message: params.message,
    address: params.address,
    signature: params.signature,
  });
  if (!valid) {
    throw new AuthError("invalid_signature", "Signature verification failed");
  }

  await db.update(authNonces).set({ consumedAt: new Date() }).where(eq(authNonces.id, nonceRow.id));

  const [existingWallet] = await db
    .select()
    .from(walletIdentities)
    .where(
      and(eq(walletIdentities.chain, params.chain), eq(walletIdentities.address, params.address)),
    )
    .limit(1);

  let userId: string;

  if (existingWallet) {
    if (params.linkingUserId && existingWallet.userId !== params.linkingUserId) {
      throw new AuthError(
        "wallet_linked_elsewhere",
        "This wallet is already linked to a different account",
      );
    }
    userId = existingWallet.userId;
  } else if (params.linkingUserId) {
    await db.insert(walletIdentities).values({
      userId: params.linkingUserId,
      chain: params.chain,
      address: params.address,
      networkMode: "testnet",
      verifiedAt: new Date(),
    });
    userId = params.linkingUserId;
  } else {
    // KNOWN GAP: wallet-first signup does not collect DOB/location at account-creation time
    // (same gap as Google sign-in — see findOrCreateGoogleUser above). The account is created
    // eligibility-incomplete; `submitOAuthEligibility()` must be called and pass before
    // createPackOffer() will allow a purchase (enforced in offer-service.ts). A client-side
    // modal collecting DOB/country before or right after the wallet signature request is the
    // remaining UI gap — tracked in PROJECT_STATUS.md.
    const suffix = generateOpaqueToken(4)
      .replace(/[^a-zA-Z0-9]/g, "")
      .slice(0, 6);
    const [newUser] = await db
      .insert(users)
      .values({
        username: `collector-${suffix}`,
        primaryAuthMethod: "wallet",
        marketingConsent: false,
        termsAcceptedVersion: CURRENT_TERMS_VERSION,
        termsAcceptedAt: new Date(),
        privacyAcceptedVersion: CURRENT_PRIVACY_VERSION,
        responsiblePurchasingAcceptedVersion: CURRENT_RESPONSIBLE_PURCHASING_VERSION,
        officialPackRulesAcceptedVersion: CURRENT_OFFICIAL_PACK_RULES_VERSION,
        country: "US",
      })
      .returning({ id: users.id });
    await db
      .insert(userProfiles)
      .values({ userId: newUser.id, displayName: `Collector ${suffix}` });
    await db.insert(walletIdentities).values({
      userId: newUser.id,
      chain: params.chain,
      address: params.address,
      networkMode: "testnet",
      verifiedAt: new Date(),
      isPreferredPayment: true,
    });
    userId = newUser.id;
  }

  const session = await createSession({ userId, authMethod: "wallet", ...params.sessionParams });
  return { ...session, userId };
}
