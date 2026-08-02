import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/server/db/client";
import {
  authNonces,
  eligibilityRecords,
  emailVerificationTokens,
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
import { generateOpaqueToken, hashToken } from "./tokens";
import { sendEmail } from "@/server/email/send";
import { createSession, type CreateSessionParams } from "./session";
import {
  buildWalletSignatureMessage,
  parseWalletSignatureMessage,
  type WalletSignaturePayload,
} from "./wallet-message";
import { verifyWalletSignature } from "./wallet-verify";

const EMAIL_TOKEN_TTL_MS = 30 * 60 * 1000; // 30 minutes
const NONCE_TTL_MS = 5 * 60 * 1000; // 5 minutes

export class AuthError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

export interface SignUpWithEmailParams {
  email: string;
  username: string;
  displayName: string;
  dateOfBirth: string;
  ageAcknowledged18Plus: boolean;
  country: string;
  stateOrProvince?: string;
  marketingConsent: boolean;
  termsAccepted: boolean;
  referralCode?: string;
  sessionCorrelationId: string;
}

/**
 * Passwordless email signup: eligibility is enforced server-side (never trust a client
 * "I am 18+" flag alone), then a verification token is emailed. The account exists but
 * `emailVerifiedAt` is null and no session is issued until `verifyEmailToken` succeeds.
 */
export async function signUpWithEmail(
  params: SignUpWithEmailParams,
): Promise<{ userId: string; requiresEmailVerification: true }> {
  if (!params.termsAccepted) {
    throw new AuthError(
      "terms_not_accepted",
      "Terms, Privacy, Responsible Purchasing, and Pack Rules must be accepted",
    );
  }

  const eligibility = evaluateEligibility({
    dateOfBirth: params.dateOfBirth,
    ageAcknowledged18Plus: params.ageAcknowledged18Plus,
    country: params.country,
    stateOrProvince: params.stateOrProvince,
    now: new Date(),
  });

  await db.insert(eligibilityRecords).values({
    sessionCorrelationId: params.sessionCorrelationId,
    dateOfBirth: params.dateOfBirth,
    ageAcknowledged18Plus: params.ageAcknowledged18Plus,
    locationCountry: params.country,
    locationStateOrProvince: params.stateOrProvince,
    locationAllowed:
      eligibility.eligible || !eligibility.reasons.includes("location_blocked_country"),
    policyVersion: eligibility.policyVersion,
  });

  if (!eligibility.eligible) {
    throw new AuthError("not_eligible", `Not eligible: ${eligibility.reasons.join(", ")}`);
  }

  const [existingEmail] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, params.email))
    .limit(1);
  if (existingEmail) {
    throw new AuthError("email_taken", "An account with this email already exists");
  }
  const [existingUsername] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.username, params.username))
    .limit(1);
  if (existingUsername) {
    throw new AuthError("username_taken", "That username is already taken");
  }

  const [user] = await db
    .insert(users)
    .values({
      email: params.email,
      username: params.username,
      primaryAuthMethod: "email",
      marketingConsent: params.marketingConsent,
      marketingConsentAt: params.marketingConsent ? new Date() : undefined,
      termsAcceptedVersion: CURRENT_TERMS_VERSION,
      termsAcceptedAt: new Date(),
      privacyAcceptedVersion: CURRENT_PRIVACY_VERSION,
      responsiblePurchasingAcceptedVersion: CURRENT_RESPONSIBLE_PURCHASING_VERSION,
      officialPackRulesAcceptedVersion: CURRENT_OFFICIAL_PACK_RULES_VERSION,
      country: params.country,
      stateOrProvince: params.stateOrProvince,
    })
    .returning({ id: users.id });

  await db.insert(userProfiles).values({ userId: user.id, displayName: params.displayName });

  await issueEmailToken(user.id, params.email, "verify_email");

  return { userId: user.id, requiresEmailVerification: true };
}

async function issueEmailToken(
  userId: string,
  email: string,
  purpose: "verify_email" | "login",
): Promise<void> {
  const rawToken = generateOpaqueToken();
  await db.insert(emailVerificationTokens).values({
    userId,
    tokenHash: hashToken(rawToken),
    purpose,
    expiresAt: new Date(Date.now() + EMAIL_TOKEN_TTL_MS),
  });

  const verifyUrl = `/api/auth/${purpose === "login" ? "login/verify" : "verify-email"}?token=${rawToken}`;
  await sendEmail({
    to: email,
    subject: purpose === "login" ? "Your PackX402 login link" : "Verify your PackX402 email",
    text: `Click to continue: ${verifyUrl}\n\nThis link expires in 30 minutes. If you didn't request this, ignore it.`,
  });
}

export async function requestLoginEmail(email: string): Promise<void> {
  const [user] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);
  // Deliberately does not reveal whether the account exists.
  if (user) {
    await issueEmailToken(user.id, email, "login");
  }
}

async function consumeEmailToken(
  rawToken: string,
  purpose: "verify_email" | "login",
): Promise<{ userId: string }> {
  const tokenHash = hashToken(rawToken);
  const [row] = await db
    .select()
    .from(emailVerificationTokens)
    .where(
      and(
        eq(emailVerificationTokens.tokenHash, tokenHash),
        eq(emailVerificationTokens.purpose, purpose),
      ),
    )
    .limit(1);

  if (!row || row.consumedAt || row.expiresAt.getTime() < Date.now()) {
    throw new AuthError("invalid_token", "This link is invalid or has expired");
  }

  await db
    .update(emailVerificationTokens)
    .set({ consumedAt: new Date() })
    .where(eq(emailVerificationTokens.id, row.id));

  return { userId: row.userId };
}

export async function verifyEmailToken(
  rawToken: string,
  sessionParams: Omit<CreateSessionParams, "userId" | "authMethod">,
): Promise<{ token: string; expiresAt: Date; userId: string }> {
  const { userId } = await consumeEmailToken(rawToken, "verify_email");
  await db.update(users).set({ emailVerifiedAt: new Date() }).where(eq(users.id, userId));
  const session = await createSession({ userId, authMethod: "email", ...sessionParams });
  return { ...session, userId };
}

export async function completeEmailLogin(
  rawToken: string,
  sessionParams: Omit<CreateSessionParams, "userId" | "authMethod">,
): Promise<{ token: string; expiresAt: Date; userId: string }> {
  const { userId } = await consumeEmailToken(rawToken, "login");
  const session = await createSession({ userId, authMethod: "email", ...sessionParams });
  return { ...session, userId };
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
    // KNOWN GAP: wallet-first signup does not currently collect/check DOB or blocked-location
    // eligibility before creating the account, unlike signUpWithEmail(). Spec section 6 requires
    // the eligibility gate before ANY account creation, including wallet-first. Before shipping
    // wallet-first signup, this branch must collect DOB/country from the client (a modal shown
    // before the wallet signature request) and call evaluateEligibility()/insert an
    // eligibility_records row exactly as signUpWithEmail does. Tracked in PROJECT_STATUS.md.
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
