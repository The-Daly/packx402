import { describe, expect, it } from "vitest";
import algosdk from "algosdk";
import nacl from "tweetnacl";
import { Keypair } from "@solana/web3.js";
import { privateKeyToAccount, generatePrivateKey } from "viem/accounts";
import { buildWalletSignatureMessage } from "./wallet-message";
import {
  verifyAlgorandSignature,
  verifyEvmSignature,
  verifySolanaSignature,
  verifyWalletSignature,
} from "./wallet-verify";

const basePayload = {
  domain: "packx402.example",
  uri: "https://packx402.example/login",
  purpose: "login" as const,
  nonce: "test-nonce-0001",
  issuedAt: "2026-08-01T12:00:00.000Z",
  expiresAt: "2026-08-01T12:05:00.000Z",
};

describe("Algorand wallet signature verification", () => {
  it("accepts a genuine signature from the claimed account", async () => {
    const account = algosdk.generateAccount();
    const message = buildWalletSignatureMessage({
      ...basePayload,
      chain: "algorand",
      address: account.addr.toString(),
    });
    const signature = algosdk.signBytes(new TextEncoder().encode(message), account.sk);
    const signatureBase64 = Buffer.from(signature).toString("base64");

    const valid = await verifyAlgorandSignature({
      message,
      address: account.addr.toString(),
      signatureBase64,
    });
    expect(valid).toBe(true);
  });

  it("rejects a signature from a different account", async () => {
    const account = algosdk.generateAccount();
    const impostor = algosdk.generateAccount();
    const message = buildWalletSignatureMessage({
      ...basePayload,
      chain: "algorand",
      address: account.addr.toString(),
    });
    const signature = algosdk.signBytes(new TextEncoder().encode(message), impostor.sk);

    const valid = await verifyAlgorandSignature({
      message,
      address: account.addr.toString(),
      signatureBase64: Buffer.from(signature).toString("base64"),
    });
    expect(valid).toBe(false);
  });

  it("rejects a tampered message", async () => {
    const account = algosdk.generateAccount();
    const message = buildWalletSignatureMessage({
      ...basePayload,
      chain: "algorand",
      address: account.addr.toString(),
    });
    const signature = algosdk.signBytes(new TextEncoder().encode(message), account.sk);
    const tamperedMessage = message.replace("login", "wallet_link");

    const valid = await verifyAlgorandSignature({
      message: tamperedMessage,
      address: account.addr.toString(),
      signatureBase64: Buffer.from(signature).toString("base64"),
    });
    expect(valid).toBe(false);
  });
});

describe("Solana wallet signature verification", () => {
  it("accepts a genuine signature from the claimed account", async () => {
    const keypair = Keypair.generate();
    const address = keypair.publicKey.toBase58();
    const message = buildWalletSignatureMessage({ ...basePayload, chain: "solana", address });
    const signature = nacl.sign.detached(new TextEncoder().encode(message), keypair.secretKey);

    const valid = await verifySolanaSignature({
      message,
      address,
      signatureBase64: Buffer.from(signature).toString("base64"),
    });
    expect(valid).toBe(true);
  });

  it("rejects a signature from a different account", async () => {
    const keypair = Keypair.generate();
    const impostor = Keypair.generate();
    const address = keypair.publicKey.toBase58();
    const message = buildWalletSignatureMessage({ ...basePayload, chain: "solana", address });
    const signature = nacl.sign.detached(new TextEncoder().encode(message), impostor.secretKey);

    const valid = await verifySolanaSignature({
      message,
      address,
      signatureBase64: Buffer.from(signature).toString("base64"),
    });
    expect(valid).toBe(false);
  });
});

describe("EVM wallet signature verification", () => {
  it("accepts a genuine signature from the claimed account", async () => {
    const privateKey = generatePrivateKey();
    const account = privateKeyToAccount(privateKey);
    const message = buildWalletSignatureMessage({
      ...basePayload,
      chain: "evm",
      address: account.address,
    });
    const signature = await account.signMessage({ message });

    const valid = await verifyEvmSignature({
      message,
      address: account.address,
      signatureHex: signature,
    });
    expect(valid).toBe(true);
  });

  it("rejects a signature from a different account", async () => {
    const account = privateKeyToAccount(generatePrivateKey());
    const impostor = privateKeyToAccount(generatePrivateKey());
    const message = buildWalletSignatureMessage({
      ...basePayload,
      chain: "evm",
      address: account.address,
    });
    const signature = await impostor.signMessage({ message });

    const valid = await verifyEvmSignature({
      message,
      address: account.address,
      signatureHex: signature,
    });
    expect(valid).toBe(false);
  });
});

describe("verifyWalletSignature dispatch", () => {
  it("routes to the correct chain verifier", async () => {
    const account = algosdk.generateAccount();
    const message = buildWalletSignatureMessage({
      ...basePayload,
      chain: "algorand",
      address: account.addr.toString(),
    });
    const signature = algosdk.signBytes(new TextEncoder().encode(message), account.sk);

    const valid = await verifyWalletSignature({
      chain: "algorand",
      message,
      address: account.addr.toString(),
      signature: Buffer.from(signature).toString("base64"),
    });
    expect(valid).toBe(true);
  });
});
