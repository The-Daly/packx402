"use client";

import { usdcBaseUnitsToDisplayString } from "@/shared/money";

export interface PaymentMethodPanelProps {
  amountBaseUnits: string;
  payTo: string;
  className?: string;
}

/**
 * Payment-method chooser shown once a real x402 offer exists. "Pay with wallet" is the
 * one method actually wired up (crypto/x402 — see offer-service.ts); it still can't
 * complete a payment from here because there's no wallet-connect UI yet (see
 * PROJECT_STATUS.md), so it shows the real offer details rather than faking success.
 * Apple Pay and PayPal are rendered realistically but disabled — neither has a real
 * merchant account/credential configured (no APPLE_MERCHANT_ID, no PayPal client ID),
 * so wiring them further would mean building a checkout button that cannot actually
 * charge anyone. Matches this repo's existing pattern for CardTrader/x402 live mode:
 * documented and visible, never faked as working.
 */
export function PaymentMethodPanel({ amountBaseUnits, payTo, className }: PaymentMethodPanelProps) {
  return (
    <div className={["border-border-subtle bg-surface rounded-md border p-4 text-sm", className ?? ""].join(" ")}>
      <p className="font-semibold">
        Pay ${usdcBaseUnitsToDisplayString(Number(amountBaseUnits))} USDC
      </p>

      <div className="mt-3 flex flex-col gap-2">
        <div className="border-accent/40 bg-background rounded-md border p-3">
          <p className="text-xs font-semibold tracking-wide uppercase">Wallet (crypto)</p>
          <p className="text-muted mt-1 font-mono text-xs break-all">{payTo}</p>
          <p className="text-muted mt-2 text-xs">
            Wallet-connect UI isn&apos;t live yet during this beta, so payment can&apos;t be
            completed from here — the offer above is real and expires shortly. Once a
            wallet is connected, this same flow settles payment and reveals your actual
            card.
          </p>
        </div>

        <button
          type="button"
          disabled
          title="Apple Pay requires a real merchant account (APPLE_MERCHANT_ID) — not configured yet"
          className="border-border-subtle text-muted flex cursor-not-allowed items-center justify-between rounded-md border p-3 text-left opacity-60"
        >
          <span className="font-medium">Apple Pay</span>
          <span className="text-[10px] tracking-wide uppercase">Coming soon</span>
        </button>

        <button
          type="button"
          disabled
          title="PayPal requires a real merchant client ID (PAYPAL_CLIENT_ID) — not configured yet"
          className="border-border-subtle text-muted flex cursor-not-allowed items-center justify-between rounded-md border p-3 text-left opacity-60"
        >
          <span className="font-medium">PayPal</span>
          <span className="text-[10px] tracking-wide uppercase">Coming soon</span>
        </button>
      </div>
    </div>
  );
}
