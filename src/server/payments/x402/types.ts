/**
 * Minimal x402 protocol types shared across chain adapters. Modeled on the public x402
 * spec (HTTP 402 + PaymentRequirements + X-PAYMENT header + facilitator verify/settle).
 * See docs/DECISIONS.md for links and version notes.
 */

export interface X402PaymentRequirements {
  scheme: "exact";
  network: string; // e.g. "algorand-testnet", "algorand-mainnet", "solana-devnet", "base-sepolia"
  maxAmountRequired: string; // decimal string, base units
  resource: string; // the resource URL being paid for
  description: string;
  mimeType: string;
  payTo: string; // merchant address
  asset: string; // ASA id / mint address / contract address
  maxTimeoutSeconds: number;
  extra?: Record<string, unknown>;
}

export interface X402PaymentRequiredResponse {
  x402Version: number;
  error: string;
  accepts: X402PaymentRequirements[];
}

export interface X402VerifyResult {
  isValid: boolean;
  invalidReason?: string;
  payerAddress?: string;
  settledAmount?: string;
  txHashOrPaymentId?: string;
}

export interface X402SettleResult {
  success: boolean;
  errorReason?: string;
  txHashOrPaymentId?: string;
  settledAmount?: string;
  chainRandomnessInput?: string; // e.g. the settling block's hash — used as fairness input
}

/**
 * A decoded X-PAYMENT header payload. The wire format is base64 JSON per the x402 spec;
 * ChainAdapter implementations know how to decode/validate their chain's specific shape.
 */
export interface DecodedX402Payment {
  scheme: "exact";
  network: string;
  payload: Record<string, unknown>;
}

export interface ChainPaymentAdapter {
  chain: "algorand" | "solana" | "evm";
  buildPaymentRequirements(params: {
    network: "testnet" | "mainnet";
    resource: string;
    description: string;
    amountBaseUnits: string;
    payTo: string;
    asset: string;
  }): X402PaymentRequirements;
  decodePaymentHeader(headerValue: string): DecodedX402Payment;
  verify(
    decoded: DecodedX402Payment,
    requirements: X402PaymentRequirements,
  ): Promise<X402VerifyResult>;
  settle(
    decoded: DecodedX402Payment,
    requirements: X402PaymentRequirements,
  ): Promise<X402SettleResult>;
}
