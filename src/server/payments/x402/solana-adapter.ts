import { Connection, PublicKey } from "@solana/web3.js";
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
 * Solana x402 payment adapter — TestNet/DevNet only during beta (spec section 3, 41).
 * Verifies an SPL-token (USDC) transfer by signature via a public RPC connection.
 *
 * Like the Algorand adapter, X402_FACILITATOR_MODE=mock is the default/tested path.
 * Live mode performs direct RPC verification rather than calling a third-party
 * facilitator, since this repo has not been integration-tested against one.
 */

interface SolanaPaymentPayload {
  signature: string;
  senderAddress: string;
}

class X402SolanaDecodeError extends Error {}

function getConnection(): Connection {
  return new Connection(serverEnv.SOLANA_RPC_URL, "confirmed");
}

export const solanaPaymentAdapter: ChainPaymentAdapter = {
  chain: "solana",

  buildPaymentRequirements({ resource, description, amountBaseUnits, payTo, asset }) {
    const req: X402PaymentRequirements = {
      scheme: "exact",
      network: `solana-${serverEnv.SOLANA_NETWORK}`,
      maxAmountRequired: amountBaseUnits,
      resource,
      description,
      mimeType: "application/json",
      payTo,
      asset,
      maxTimeoutSeconds: 300,
      extra: { assetType: "spl-token", facilitatorMode: serverEnv.X402_FACILITATOR_MODE },
    };
    return req;
  },

  decodePaymentHeader(headerValue) {
    let raw: Record<string, unknown>;
    try {
      raw = JSON.parse(Buffer.from(headerValue, "base64").toString("utf8"));
    } catch {
      throw new X402SolanaDecodeError("X-PAYMENT header is not valid base64 JSON");
    }
    const payload = raw.payload as Record<string, unknown> | undefined;
    if (
      !payload ||
      typeof payload.signature !== "string" ||
      typeof payload.senderAddress !== "string"
    ) {
      throw new X402SolanaDecodeError("Solana payment payload missing signature/senderAddress");
    }
    return {
      scheme: "exact",
      network: typeof raw.network === "string" ? raw.network : `solana-${serverEnv.SOLANA_NETWORK}`,
      payload,
    };
  },

  async verify(
    decoded: DecodedX402Payment,
    requirements: X402PaymentRequirements,
  ): Promise<X402VerifyResult> {
    const payload = decoded.payload as unknown as SolanaPaymentPayload;

    if (serverEnv.X402_FACILITATOR_MODE === "mock") {
      return {
        isValid: true,
        payerAddress: payload.senderAddress,
        settledAmount: requirements.maxAmountRequired,
        txHashOrPaymentId: payload.signature,
      };
    }

    try {
      const connection = getConnection();
      const tx = await connection.getParsedTransaction(payload.signature, {
        maxSupportedTransactionVersion: 0,
        commitment: "confirmed",
      });
      if (!tx || tx.meta?.err) {
        return { isValid: false, invalidReason: "transaction not found or failed on-chain" };
      }

      const mint = requirements.asset;
      const post = tx.meta?.postTokenBalances ?? [];
      const pre = tx.meta?.preTokenBalances ?? [];
      const payToKey = new PublicKey(requirements.payTo).toBase58();

      const postForRecipient = post.find((b) => b.mint === mint && b.owner === payToKey);
      const preForRecipient = pre.find((b) => b.mint === mint && b.owner === payToKey);
      if (!postForRecipient) {
        return { isValid: false, invalidReason: "recipient did not receive the expected token" };
      }

      const postAmount = BigInt(postForRecipient.uiTokenAmount.amount);
      const preAmount = preForRecipient ? BigInt(preForRecipient.uiTokenAmount.amount) : 0n;
      const received = postAmount - preAmount;
      const required = BigInt(requirements.maxAmountRequired);
      if (received < required) {
        return { isValid: false, invalidReason: "underpayment" };
      }

      return {
        isValid: true,
        payerAddress: payload.senderAddress,
        settledAmount: received.toString(),
        txHashOrPaymentId: payload.signature,
      };
    } catch (err) {
      return {
        isValid: false,
        invalidReason: err instanceof Error ? err.message : "solana verification failed",
      };
    }
  },

  async settle(
    decoded: DecodedX402Payment,
    requirements: X402PaymentRequirements,
  ): Promise<X402SettleResult> {
    const payload = decoded.payload as unknown as SolanaPaymentPayload;

    if (serverEnv.X402_FACILITATOR_MODE === "mock") {
      return {
        success: true,
        txHashOrPaymentId: payload.signature,
        settledAmount: requirements.maxAmountRequired,
        chainRandomnessInput: sha256Hex(`mock-chain-randomness:${payload.signature}`),
      };
    }

    try {
      const connection = getConnection();
      const tx = await connection.getParsedTransaction(payload.signature, {
        maxSupportedTransactionVersion: 0,
        commitment: "confirmed",
      });
      if (!tx || tx.meta?.err) {
        return { success: false, errorReason: "transaction not confirmed" };
      }
      const blockhash = tx.transaction.message.recentBlockhash;
      return {
        success: true,
        txHashOrPaymentId: payload.signature,
        settledAmount: requirements.maxAmountRequired,
        chainRandomnessInput: blockhash
          ? sha256Hex(blockhash)
          : sha256Hex(`fallback-chain-randomness:${payload.signature}`),
      };
    } catch (err) {
      return {
        success: false,
        errorReason: err instanceof Error ? err.message : "settlement failed",
      };
    }
  },
};
