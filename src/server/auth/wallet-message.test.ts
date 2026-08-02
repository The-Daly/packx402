import { describe, expect, it } from "vitest";
import {
  buildWalletSignatureMessage,
  parseWalletSignatureMessage,
  WalletMessageParseError,
  type WalletSignaturePayload,
} from "./wallet-message";

const payload: WalletSignaturePayload = {
  domain: "packx402.example",
  address: "ALGOADDRESSFIXTUREXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
  chain: "algorand",
  uri: "https://packx402.example/login",
  purpose: "login",
  nonce: "0123456789abcdef",
  issuedAt: "2026-08-01T12:00:00.000Z",
  expiresAt: "2026-08-01T12:05:00.000Z",
};

describe("wallet signature message", () => {
  it("round-trips build -> parse", () => {
    const message = buildWalletSignatureMessage(payload);
    const parsed = parseWalletSignatureMessage(message);
    expect(parsed).toEqual(payload);
  });

  it("produces a human-readable message containing every required field (spec section 8)", () => {
    const message = buildWalletSignatureMessage(payload);
    expect(message).toContain(payload.domain);
    expect(message).toContain(payload.uri);
    expect(message).toContain(payload.chain);
    expect(message).toContain(payload.nonce);
    expect(message).toContain(payload.purpose);
    expect(message).toContain(payload.issuedAt);
    expect(message).toContain(payload.expiresAt);
  });

  it("round-trips for solana and evm chains too", () => {
    for (const chain of ["solana", "evm"] as const) {
      const p = { ...payload, chain };
      expect(parseWalletSignatureMessage(buildWalletSignatureMessage(p))).toEqual(p);
    }
  });

  it("rejects a garbage message", () => {
    expect(() => parseWalletSignatureMessage("not a valid message")).toThrow(
      WalletMessageParseError,
    );
  });

  it("rejects a message with an unknown purpose", () => {
    const message = buildWalletSignatureMessage(payload).replace(
      "Purpose: login",
      "Purpose: withdraw_funds",
    );
    expect(() => parseWalletSignatureMessage(message)).toThrow(WalletMessageParseError);
  });
});
