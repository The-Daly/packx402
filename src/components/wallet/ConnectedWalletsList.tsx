"use client";

import { useEffect, useState } from "react";

interface WalletRow {
  id: string;
  chain: "algorand" | "solana" | "evm";
  address: string;
  networkMode: string;
  isPreferredPayment: boolean;
  verifiedAt: string;
}

function shortAddress(address: string): string {
  return address.length > 12 ? `${address.slice(0, 6)}…${address.slice(-4)}` : address;
}

/** Read-only list of the signed-in user's linked wallet identities. Linking an
 * *additional* wallet to an already-Google-authenticated account isn't wired up in the UI
 * yet (see PROJECT_STATUS.md) — connecting Pera from the opening flow links it as this
 * account's payment wallet the first time a wallet-first user signs a message there. */
export function ConnectedWalletsList() {
  const [wallets, setWallets] = useState<WalletRow[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/auth/wallet/list")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled) setWallets(data && Array.isArray(data.wallets) ? data.wallets : []);
      })
      .catch(() => {
        if (!cancelled) setWallets([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (wallets === null) {
    return <p className="text-muted text-sm">Loading…</p>;
  }

  if (wallets.length === 0) {
    return (
      <p className="border-border-subtle bg-surface text-muted rounded-lg border p-4 text-sm">
        No wallet linked yet — connecting a wallet during checkout links it here
        automatically.
      </p>
    );
  }

  return (
    <ul className="space-y-2">
      {wallets.map((w) => (
        <li
          key={w.id}
          className="border-border-subtle bg-surface flex items-center justify-between rounded-lg border p-3 text-sm"
        >
          <div>
            <p className="font-medium">
              {w.chain.charAt(0).toUpperCase() + w.chain.slice(1)} — {shortAddress(w.address)}
              {w.isPreferredPayment && (
                <span className="text-accent ml-2 text-xs font-semibold">Preferred</span>
              )}
            </p>
            <p className="text-muted text-xs">{w.networkMode}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}
