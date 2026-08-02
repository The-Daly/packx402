import { createPublicClient, http, getAddress } from "viem";
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
 * EVM x402 payment adapter — TestNet only during beta (e.g. Base Sepolia). Verifies a
 * USDC ERC-20 transfer by transaction hash via a public RPC provider.
 *
 * Like the other chain adapters, X402_FACILITATOR_MODE=mock is the default/tested path;
 * live mode performs direct RPC log verification of the ERC-20 Transfer event, matched by
 * its canonical topic0 hash: keccak256("Transfer(address,address,uint256)") =
 * 0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef
 */

interface EvmPaymentPayload {
  txHash: `0x${string}`;
  senderAddress: string;
}

class X402EvmDecodeError extends Error {}

function getClient() {
  return createPublicClient({ transport: http(serverEnv.EVM_RPC_URL) });
}

export const evmPaymentAdapter: ChainPaymentAdapter = {
  chain: "evm",

  buildPaymentRequirements({ resource, description, amountBaseUnits, payTo, asset }) {
    const req: X402PaymentRequirements = {
      scheme: "exact",
      network: serverEnv.EVM_NETWORK,
      maxAmountRequired: amountBaseUnits,
      resource,
      description,
      mimeType: "application/json",
      payTo,
      asset,
      maxTimeoutSeconds: 300,
      extra: { assetType: "erc20", facilitatorMode: serverEnv.X402_FACILITATOR_MODE },
    };
    return req;
  },

  decodePaymentHeader(headerValue) {
    let raw: Record<string, unknown>;
    try {
      raw = JSON.parse(Buffer.from(headerValue, "base64").toString("utf8"));
    } catch {
      throw new X402EvmDecodeError("X-PAYMENT header is not valid base64 JSON");
    }
    const payload = raw.payload as Record<string, unknown> | undefined;
    if (
      !payload ||
      typeof payload.txHash !== "string" ||
      typeof payload.senderAddress !== "string"
    ) {
      throw new X402EvmDecodeError("EVM payment payload missing txHash/senderAddress");
    }
    return {
      scheme: "exact",
      network: typeof raw.network === "string" ? raw.network : serverEnv.EVM_NETWORK,
      payload,
    };
  },

  async verify(
    decoded: DecodedX402Payment,
    requirements: X402PaymentRequirements,
  ): Promise<X402VerifyResult> {
    const payload = decoded.payload as unknown as EvmPaymentPayload;

    if (serverEnv.X402_FACILITATOR_MODE === "mock") {
      return {
        isValid: true,
        payerAddress: payload.senderAddress,
        settledAmount: requirements.maxAmountRequired,
        txHashOrPaymentId: payload.txHash,
      };
    }

    try {
      const client = getClient();
      const receipt = await client.getTransactionReceipt({ hash: payload.txHash });
      if (receipt.status !== "success") {
        return { isValid: false, invalidReason: "transaction reverted or not confirmed" };
      }

      const tokenAddress = getAddress(requirements.asset);
      const recipient = getAddress(requirements.payTo);
      const transferLog = receipt.logs.find(
        (log) =>
          log.address.toLowerCase() === tokenAddress.toLowerCase() &&
          log.topics[0] === "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef",
      );
      if (!transferLog) {
        return { isValid: false, invalidReason: "no matching USDC transfer log found" };
      }

      const toTopic = transferLog.topics[2];
      const toAddress = toTopic ? getAddress(`0x${toTopic.slice(-40)}`) : undefined;
      if (toAddress?.toLowerCase() !== recipient.toLowerCase()) {
        return { isValid: false, invalidReason: "wrong recipient address" };
      }

      const amount = BigInt(transferLog.data);
      const required = BigInt(requirements.maxAmountRequired);
      if (amount < required) {
        return { isValid: false, invalidReason: "underpayment" };
      }

      return {
        isValid: true,
        payerAddress: payload.senderAddress,
        settledAmount: amount.toString(),
        txHashOrPaymentId: payload.txHash,
      };
    } catch (err) {
      return {
        isValid: false,
        invalidReason: err instanceof Error ? err.message : "evm verification failed",
      };
    }
  },

  async settle(
    decoded: DecodedX402Payment,
    requirements: X402PaymentRequirements,
  ): Promise<X402SettleResult> {
    const payload = decoded.payload as unknown as EvmPaymentPayload;

    if (serverEnv.X402_FACILITATOR_MODE === "mock") {
      return {
        success: true,
        txHashOrPaymentId: payload.txHash,
        settledAmount: requirements.maxAmountRequired,
        chainRandomnessInput: sha256Hex(`mock-chain-randomness:${payload.txHash}`),
      };
    }

    try {
      const client = getClient();
      const receipt = await client.getTransactionReceipt({ hash: payload.txHash });
      if (receipt.status !== "success") {
        return { success: false, errorReason: "transaction not confirmed" };
      }
      return {
        success: true,
        txHashOrPaymentId: payload.txHash,
        settledAmount: requirements.maxAmountRequired,
        chainRandomnessInput: sha256Hex(receipt.blockHash),
      };
    } catch (err) {
      return {
        success: false,
        errorReason: err instanceof Error ? err.message : "settlement failed",
      };
    }
  },
};
