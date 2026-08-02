"use client";

import { useState } from "react";
import { useWallet } from "@txnlab/use-wallet-react";
import algosdk from "algosdk";
import { ConnectPeraButton } from "./ConnectPeraButton";
import { usdcBaseUnitsToDisplayString } from "@/shared/money";

export interface PayWithWalletButtonProps {
  offerId: string;
  amountBaseUnits: string;
  payTo: string;
  asset: string; // ASA id, as a string per X402PaymentRequirements
  network: string; // "algorand-testnet" | "algorand-mainnet" — echoed straight into the X-PAYMENT header
  /** Called with the full settlement response once the open endpoint returns 200. Never
   * fabricates a result — this only fires after a real signed-and-submitted transaction. */
  onSettled: (data: Record<string, unknown>) => void;
  className?: string;
}

/**
 * Completes the second half of the x402 flow the moment a wallet is connected: builds a
 * real Algorand ASA-transfer transaction from the server's own PaymentRequirements
 * (amount/recipient/asset — never client-invented values), signs it via the connected
 * Pera wallet, submits it to algod, waits for confirmation, and re-POSTs the open endpoint
 * with a real X-PAYMENT header built from the resulting txId — the exact shape
 * src/server/payments/x402/algorand-adapter.ts's decodePaymentHeader expects. This is the
 * one piece of PackX402 that could not be exercised in this sandboxed dev environment (no
 * funded TestNet Pera wallet available) — implemented against the documented adapter
 * contract but unverified against a real signed transaction, same status as the rest of
 * this repo's live-mode payment paths.
 */
export function PayWithWalletButton({
  offerId,
  amountBaseUnits,
  payTo,
  asset,
  network,
  onSettled,
  className,
}: PayWithWalletButtonProps) {
  const { activeAddress, activeWallet, algodClient, transactionSigner } = useWallet();
  const [status, setStatus] = useState<"idle" | "signing" | "submitting" | "confirming" | "settling">(
    "idle",
  );
  const [error, setError] = useState<string | null>(null);

  if (!activeAddress || !activeWallet) {
    return <ConnectPeraButton className={className} />;
  }

  async function handlePay() {
    setError(null);
    try {
      setStatus("signing");
      const suggestedParams = await algodClient.getTransactionParams().do();
      const txn = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
        sender: activeAddress!,
        receiver: payTo,
        amount: BigInt(amountBaseUnits),
        assetIndex: Number(asset),
        suggestedParams,
      });

      const signed = await transactionSigner([txn], [0]);
      if (!signed[0]) throw new Error("Wallet did not return a signed transaction");

      setStatus("submitting");
      const { txid } = await algodClient.sendRawTransaction(signed[0]).do();

      setStatus("confirming");
      await algosdk.waitForConfirmation(algodClient, txid, 4);

      setStatus("settling");
      const paymentHeader = Buffer.from(
        JSON.stringify({ network, payload: { txId: txid, senderAddress: activeAddress } }),
      ).toString("base64");

      const res = await fetch(`/api/x402/algorand/v1/packs/open?offerId=${offerId}`, {
        method: "POST",
        headers: { "X-PAYMENT": paymentHeader },
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message ?? data.error ?? "Settlement failed after payment.");
        setStatus("idle");
        return;
      }
      onSettled(data);
      setStatus("idle");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Payment failed.");
      setStatus("idle");
    }
  }

  const labels: Record<typeof status, string> = {
    idle: `Pay $${usdcBaseUnitsToDisplayString(Number(amountBaseUnits))} with Pera`,
    signing: "Confirm in Pera…",
    submitting: "Submitting…",
    confirming: "Confirming on-chain…",
    settling: "Finalizing…",
  };

  return (
    <div className={className}>
      <button
        type="button"
        onClick={handlePay}
        disabled={status !== "idle"}
        className="bg-accent text-accent-foreground hover:bg-accent-strong w-full rounded-md px-4 py-2 text-sm font-semibold disabled:opacity-60"
      >
        {labels[status]}
      </button>
      {error && <p className="text-danger mt-2 text-xs">{error}</p>}
    </div>
  );
}
