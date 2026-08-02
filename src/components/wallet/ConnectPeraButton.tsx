"use client";

import { useWallet } from "@txnlab/use-wallet-react";
import { WalletId } from "@txnlab/use-wallet";

function shortenAddress(address: string): string {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

export interface ConnectPeraButtonProps {
  className?: string;
}

/**
 * Real Pera Wallet connect/disconnect control (Algorand TestNet only — see
 * WalletManagerProvider). This is the wallet-connect UI PROJECT_STATUS.md previously
 * flagged as missing; PayWithWalletButton is what actually uses the resulting connected
 * account to sign and submit a payment.
 */
export function ConnectPeraButton({ className }: ConnectPeraButtonProps) {
  const { wallets, activeAddress } = useWallet();
  const pera = wallets.find((w) => w.id === WalletId.PERA);

  if (!pera) return null;

  if (activeAddress) {
    return (
      <div className={["flex items-center gap-2 text-xs", className ?? ""].join(" ")}>
        <span className="border-accent/40 bg-surface text-accent rounded-full border px-2 py-1 font-mono">
          {shortenAddress(activeAddress)}
        </span>
        <button
          type="button"
          onClick={() => pera.disconnect()}
          className="text-muted hover:text-foreground underline"
        >
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => pera.connect()}
      className={
        className ??
        "border-accent/40 text-accent hover:bg-accent/10 rounded-md border px-4 py-2 text-sm font-semibold"
      }
    >
      Connect Pera Wallet
    </button>
  );
}
