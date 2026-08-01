import { db } from "@/server/db/client";
import { sessions } from "@/server/db/schema";
import { and, eq, isNull } from "drizzle-orm";
import { generateOpaqueToken, hashToken } from "./tokens";

export const SESSION_COOKIE_NAME = "packx402_session";
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export interface CreateSessionParams {
  userId: string;
  authMethod: "email" | "wallet" | "passkey";
  userAgent?: string;
  ipHash?: string;
}

export async function createSession(params: CreateSessionParams): Promise<{
  token: string;
  sessionId: string;
  expiresAt: Date;
}> {
  const token = generateOpaqueToken();
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

  const [row] = await db
    .insert(sessions)
    .values({
      userId: params.userId,
      tokenHash,
      authMethod: params.authMethod,
      userAgent: params.userAgent,
      ipHash: params.ipHash,
      expiresAt,
    })
    .returning({ id: sessions.id });

  return { token, sessionId: row.id, expiresAt };
}

export interface ValidatedSession {
  sessionId: string;
  userId: string;
  authMethod: "email" | "wallet" | "passkey";
}

/**
 * Validates a raw session token from the request cookie. Returns null for any invalid,
 * expired, or revoked session — callers should treat that uniformly as "not authenticated"
 * without leaking which specific reason applied.
 */
export async function validateSessionToken(token: string): Promise<ValidatedSession | null> {
  const tokenHash = hashToken(token);
  const [row] = await db
    .select({
      id: sessions.id,
      userId: sessions.userId,
      authMethod: sessions.authMethod,
      expiresAt: sessions.expiresAt,
      revokedAt: sessions.revokedAt,
    })
    .from(sessions)
    .where(eq(sessions.tokenHash, tokenHash))
    .limit(1);

  if (!row) return null;
  if (row.revokedAt) return null;
  if (row.expiresAt.getTime() < Date.now()) return null;

  await db.update(sessions).set({ lastSeenAt: new Date() }).where(eq(sessions.id, row.id));

  return { sessionId: row.id, userId: row.userId, authMethod: row.authMethod };
}

export async function revokeSession(
  sessionId: string,
  reason: "user_revoked" | "admin_revoked" | "suspicious_login" = "user_revoked",
): Promise<void> {
  await db
    .update(sessions)
    .set({ revokedAt: new Date(), revokedReason: reason })
    .where(and(eq(sessions.id, sessionId), isNull(sessions.revokedAt)));
}

/**
 * Revokes every active session for a user, including the caller's own current session.
 * The "sign out everywhere" UI flow re-authenticates (or redirects to login) immediately
 * after calling this — there is no partial "everyone but me" variant, which would leave
 * an ambiguous window where the revoking device's own session validity depends on
 * ordering.
 */
export async function revokeAllSessionsForUser(userId: string): Promise<void> {
  await db
    .update(sessions)
    .set({ revokedAt: new Date(), revokedReason: "user_revoked_all" })
    .where(and(eq(sessions.userId, userId), isNull(sessions.revokedAt)));
}

export async function listActiveSessionsForUser(userId: string) {
  return db
    .select({
      id: sessions.id,
      authMethod: sessions.authMethod,
      userAgent: sessions.userAgent,
      createdAt: sessions.createdAt,
      lastSeenAt: sessions.lastSeenAt,
      expiresAt: sessions.expiresAt,
    })
    .from(sessions)
    .where(and(eq(sessions.userId, userId), isNull(sessions.revokedAt)));
}

export function sessionCookieOptions(expiresAt: Date) {
  return {
    httpOnly: true,
    secure: true,
    sameSite: "lax" as const,
    path: "/",
    expires: expiresAt,
  };
}
