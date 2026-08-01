import algosdk from "algosdk";
import nacl from "tweetnacl";
import { PublicKey } from "@solana/web3.js";
import { recoverMessageAddress } from "viem";
import type { WalletSignaturePayload } from "./wallet-message";

/**
 * Per-chain signature verification for wallet login/link (spec section 8). Each function
 * takes the exact message string the wallet was asked to sign and a chain-appropriate
 * encoded signature, and returns whether it was produced by the claimed address's key.
 */

export async function verifyAlgorandSignature(params: {
  message: string;
  address: string;
  signatureBase64: string;
}): Promise<boolean> {
  try {
    const messageBytes = new TextEncoder().encode(params.message);
    const signatureBytes = Buffer.from(params.signatureBase64, "base64");
    return algosdk.verifyBytes(messageBytes, signatureBytes, params.address);
  } catch {
    return false;
  }
}

export async function verifySolanaSignature(params: {
  message: string;
  address: string;
  signatureBase64: string;
}): Promise<boolean> {
  try {
    const messageBytes = new TextEncoder().encode(params.message);
    const signatureBytes = Buffer.from(params.signatureBase64, "base64");
    const publicKeyBytes = new PublicKey(params.address).toBytes();
    return nacl.sign.detached.verify(messageBytes, signatureBytes, publicKeyBytes);
  } catch {
    return false;
  }
}

export async function verifyEvmSignature(params: {
  message: string;
  address: string;
  signatureHex: `0x${string}`;
}): Promise<boolean> {
  try {
    const recovered = await recoverMessageAddress({
      message: params.message,
      signature: params.signatureHex,
    });
    return recovered.toLowerCase() === params.address.toLowerCase();
  } catch {
    return false;
  }
}

export async function verifyWalletSignature(params: {
  chain: WalletSignaturePayload["chain"];
  message: string;
  address: string;
  signature: string;
}): Promise<boolean> {
  switch (params.chain) {
    case "algorand":
      return verifyAlgorandSignature({
        message: params.message,
        address: params.address,
        signatureBase64: params.signature,
      });
    case "solana":
      return verifySolanaSignature({
        message: params.message,
        address: params.address,
        signatureBase64: params.signature,
      });
    case "evm":
      return verifyEvmSignature({
        message: params.message,
        address: params.address,
        signatureHex: params.signature as `0x${string}`,
      });
  }
}
