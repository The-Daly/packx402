import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { serverEnv } from "@/server/env";

/**
 * AES-256-GCM field-level encryption for sensitive DB columns (shipping addresses,
 * fairness server seeds pre-reveal). Output format: base64(iv[12] || authTag[16] || ciphertext).
 * FIELD_ENCRYPTION_KEY is a 32-byte hex string validated by src/server/env.ts.
 */

const ALGORITHM = "aes-256-gcm";

function getKey(): Buffer {
  return Buffer.from(serverEnv.FIELD_ENCRYPTION_KEY, "hex");
}

export function encryptField(plaintext: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGORITHM, getKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return Buffer.concat([iv, authTag, ciphertext]).toString("base64");
}

export function decryptField(encoded: string): string {
  const buf = Buffer.from(encoded, "base64");
  const iv = buf.subarray(0, 12);
  const authTag = buf.subarray(12, 28);
  const ciphertext = buf.subarray(28);
  const decipher = createDecipheriv(ALGORITHM, getKey(), iv);
  decipher.setAuthTag(authTag);
  const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return plaintext.toString("utf8");
}
