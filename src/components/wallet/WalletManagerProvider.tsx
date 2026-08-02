"use client";

import { useMemo } from "react";
import { WalletManager, WalletId, NetworkId } from "@txnlab/use-wallet";
import { WalletProvider } from "@txnlab/use-wallet-react";

// Same public testnet algod node used as the server's own default
// (ALGORAND_ALGOD_URL in src/server/env.core.ts) — read-only endpoint, no secret involved,
// safe to reference directly client-side. MainNet is never enabled here: this beta only
// ever asks Pera to sign TestNet transactions (see AGENTS.md's MainNet gate).
const TESTNET_ALGOD_URL = "https://testnet-api.algonode.cloud";

export interface WalletManagerProviderProps {
  children: React.ReactNode;
}

/**
 * Wraps the app in @txnlab/use-wallet-react's WalletProvider, configured for Pera Wallet
 * on Algorand TestNet only. This is the wallet-connect UI PROJECT_STATUS.md previously
 * flagged as the single remaining blocker to completing a real pack purchase — see
 * PayWithWalletButton for the actual sign-and-submit flow this enables.
 */
export function WalletManagerProvider({ children }: WalletManagerProviderProps) {
  const manager = useMemo(
    () =>
      new WalletManager({
        wallets: [WalletId.PERA],
        defaultNetwork: NetworkId.TESTNET,
        networks: {
          [NetworkId.TESTNET]: {
            algod: { baseServer: TESTNET_ALGOD_URL, port: "", token: "" },
          },
        },
      }),
    [],
  );

  return <WalletProvider manager={manager}>{children}</WalletProvider>;
}
