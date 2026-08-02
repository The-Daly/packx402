import { describe, expect, it, beforeAll } from "vitest";

beforeAll(() => {
  process.env.FIELD_ENCRYPTION_KEY ??=
    "6e4b73a0c0b1313fe61d638bf05767a3f0cce084ce195e66fa107beee4763f6d";
  process.env.SESSION_SECRET ??= "test-session-secret-at-least-32-chars-long";
  process.env.DATABASE_URL ??= "postgres://test:test@localhost:5432/test";
  process.env.REDIS_URL ??= "redis://localhost:6379";
});

describe("field encryption", () => {
  it("round-trips plaintext", async () => {
    const { encryptField, decryptField } = await import("./field-encryption");
    const plaintext = "123 Collector Lane, Springfield";
    const encrypted = encryptField(plaintext);
    expect(encrypted).not.toContain(plaintext);
    expect(decryptField(encrypted)).toBe(plaintext);
  });

  it("produces different ciphertext for the same plaintext (random IV)", async () => {
    const { encryptField } = await import("./field-encryption");
    const a = encryptField("same input");
    const b = encryptField("same input");
    expect(a).not.toBe(b);
  });

  it("fails to decrypt tampered ciphertext", async () => {
    const { encryptField, decryptField } = await import("./field-encryption");
    const encrypted = encryptField("sensitive value");
    const buf = Buffer.from(encrypted, "base64");
    buf[buf.length - 1] ^= 0xff; // flip last byte
    const tampered = buf.toString("base64");
    expect(() => decryptField(tampered)).toThrow();
  });
});
