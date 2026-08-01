import { randomBytes, createHash } from "node:crypto";

/**
 * Opaque bearer tokens (session tokens, email verification tokens, recovery codes). Only
 * the sha256 hash is ever persisted — the raw token exists solely in the response/cookie
 * and the requester's next request. A leaked DB export never yields usable tokens.
 */

export function generateOpaqueToken(byteLength = 32): string {
  return randomBytes(byteLength).toString("base64url");
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

export function generateRecoveryCode(): string {
  // Human-typeable: 5 groups of 4 uppercase base32-ish chars, e.g. "AXQ7-KP2M-..."
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I ambiguity
  const bytes = randomBytes(20);
  let out = "";
  for (let i = 0; i < 20; i++) {
    out += alphabet[bytes[i] % alphabet.length];
    if (i % 4 === 3 && i !== 19) out += "-";
  }
  return out;
}
