import algosdk from "algosdk";
import { sha256Hex } from "@/server/fairness/engine";
import { serverEnv } from "@/server/env";
import type {
  ChainPaymentAdapter,
  DecodedX402Payment,
  X402PaymentRequirements,
  X402SettleResult,
  X402VerifyResult,
} from "./types";

/**
 * Algorand x402 payment adapter ("exact" scheme, USDC ASA transfer).
 *
 * Verification strategy:
 *  - X402_FACILITATOR_MODE=mock (default, used in dev/CI): payments are validated against
 *    the decoded X-PAYMENT payload shape only, with a deterministic synthetic settlement.
 *    Never used in production.
 *  - X402_FACILITATOR_MODE=live: verifies the referenced transaction directly against the
 *    configured Algorand algod node (confirmed round, exact ASA id, amount, and receiver).
 *    This talks to algod directly rather than the GoPlausible facilitator's HTTP API,
 *    because this repository has not been built/tested against live GoPlausible
 *    credentials — direct algod verification is the part that is actually implemented and
 *    testable today. Swapping in the GoPlausible facilitator call is a documented follow-up
 *    in DECISIONS.md once credentials are available; the ChainPaymentAdapter interface
 *    is already shaped to make that swap a single-file change.
 */

interface AlgorandPaymentPayload {
  txId: string;
  senderAddress: string;
}

function decodeBase64Json(headerValue: string): Record<string, unknown> {
  let jsonStr: string;
  try {
    jsonStr = Buffer.from(headerValue, "base64").toString("utf8");
  } catch {
    throw new X402DecodeError("X-PAYMENT header is not valid base64");
  }
  try {
    return JSON.parse(jsonStr);
  } catch {
    throw new X402DecodeError("X-PAYMENT header did not decode to valid JSON");
  }
}

export class X402DecodeError extends Error {}

function getAlgodClient(): algosdk.Algodv2 {
  const token = serverEnv.ALGORAND_ALGOD_TOKEN ?? "";
  return new algosdk.Algodv2(token, serverEnv.ALGORAND_ALGOD_URL, "");
}

export const algorandPaymentAdapter: ChainPaymentAdapter = {
  chain: "algorand",

  buildPaymentRequirements({ network, resource, description, amountBaseUnits, payTo, asset }) {
    const req: X402PaymentRequirements = {
      scheme: "exact",
      network: network === "mainnet" ? "algorand-mainnet" : "algorand-testnet",
      maxAmountRequired: amountBaseUnits,
      resource,
      description,
      mimeType: "application/json",
      payTo,
      asset,
      maxTimeoutSeconds: 300,
      extra: { assetType: "asa", facilitatorMode: serverEnv.X402_FACILITATOR_MODE },
    };
    return req;
  },

  decodePaymentHeader(headerValue) {
    const raw = decodeBase64Json(headerValue);
    const payload = raw.payload as Record<string, unknown> | undefined;
    if (!payload || typeof payload.txId !== "string" || typeof payload.senderAddress !== "string") {
      throw new X402DecodeError("Algorand payment payload missing txId/senderAddress");
    }
    return {
      scheme: "exact",
      network: typeof raw.network === "string" ? raw.network : "algorand-testnet",
      payload,
    };
  },

  async verify(
    decoded: DecodedX402Payment,
    requirements: X402PaymentRequirements,
  ): Promise<X402VerifyResult> {
    const payload = decoded.payload as unknown as AlgorandPaymentPayload;

    if (serverEnv.X402_FACILITATOR_MODE === "mock") {
      return {
        isValid: true,
        payerAddress: payload.senderAddress,
        settledAmount: requirements.maxAmountRequired,
        txHashOrPaymentId: payload.txId,
      };
    }

    // Live mode: verify directly against algod.
    try {
      const algod = getAlgodClient();
      const txInfo = await algod.pendingTransactionInformation(payload.txId).do();
      const confirmedRound = txInfo.confirmedRound ?? 0n;
      if (confirmedRound === 0n) {
        return { isValid: false, invalidReason: "transaction not yet confirmed" };
      }

      const assetTransfer = txInfo.txn?.txn?.assetTransfer;
      if (!assetTransfer) {
        return { isValid: false, invalidReason: "transaction is not an asset transfer" };
      }

      const expectedAssetId = BigInt(requirements.asset);
      if (BigInt(assetTransfer.assetIndex ?? 0) !== expectedAssetId) {
        return { isValid: false, invalidReason: "wrong asset (token) transferred" };
      }

      const receiver = assetTransfer.receiver?.toString();
      if (receiver !== requirements.payTo) {
        return { isValid: false, invalidReason: "wrong recipient address" };
      }

      const amount = assetTransfer.amount ?? 0n;
      const required = BigInt(requirements.maxAmountRequired);
      if (amount < required) {
        return { isValid: false, invalidReason: "underpayment" };
      }

      const sender = txInfo.txn?.txn?.sender?.toString();
      if (sender !== payload.senderAddress) {
        return { isValid: false, invalidReason: "sender does not match claimed payer address" };
      }

      return {
        isValid: true,
        payerAddress: sender,
        settledAmount: amount.toString(),
        txHashOrPaymentId: payload.txId,
      };
    } catch (err) {
      return {
        isValid: false,
        invalidReason: err instanceof Error ? err.message : "algod verification failed",
      };
    }
  },

  async settle(
    decoded: DecodedX402Payment,
    requirements: X402PaymentRequirements,
  ): Promise<X402SettleResult> {
    const payload = decoded.payload as unknown as AlgorandPaymentPayload;

    if (serverEnv.X402_FACILITATOR_MODE === "mock") {
      return {
        success: true,
        txHashOrPaymentId: payload.txId,
        settledAmount: requirements.maxAmountRequired,
        // Deterministic synthetic randomness for mock/dev/CI only — never used in live mode.
        chainRandomnessInput: sha256Hex(`mock-chain-randomness:${payload.txId}`),
      };
    }

    try {
      const algod = getAlgodClient();
      const txInfo = await algod.pendingTransactionInformation(payload.txId).do();
      const confirmedRound = txInfo.confirmedRound;
      if (!confirmedRound || confirmedRound === 0n) {
        return { success: false, errorReason: "transaction not confirmed" };
      }
      const block = await algod.block(Number(confirmedRound)).do();
      // The confirming block's seed is unknown to any party (including PackX402) before the
      // block is produced, and is independent of the buyer's or PackX402's control at the
      // time the server seed was committed — a suitable post-settlement randomness input.
      const blockSeed = block.block?.header?.seed;
      const chainRandomnessInput = blockSeed
        ? Buffer.from(blockSeed).toString("hex")
        : sha256Hex(`fallback-chain-randomness:${payload.txId}:${confirmedRound}`);

      return {
        success: true,
        txHashOrPaymentId: payload.txId,
        settledAmount: requirements.maxAmountRequired,
        chainRandomnessInput,
      };
    } catch (err) {
      return {
        success: false,
        errorReason: err instanceof Error ? err.message : "settlement failed",
      };
    }
  },
};
