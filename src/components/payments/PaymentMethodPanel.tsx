"use client";

import { usdcBaseUnitsToDisplayString } from "@/shared/money";
import { PayWithWalletButton } from "@/components/wallet/PayWithWalletButton";

export interface PaymentMethodPanelProps {
  offerId: string;
  amountBaseUnits: string;
  payTo: string;
  asset: string;
  network: string;
  onSettled: (data: Record<string, unknown>) => void;
  className?: string;
}

/**
 * Payment-method chooser shown once a real x402 offer exists. "Pay with wallet" is fully
 * wired up end to end: connect Pera, sign a real ASA transfer, submit it, and settle —
 * see PayWithWalletButton. Apple Pay and PayPal are rendered realistically but disabled —
 * neither has a real merchant account/credential configured (no APPLE_MERCHANT_ID, no
 * PayPal client ID), so wiring them further would mean building a checkout button that
 * cannot actually charge anyone. Matches this repo's existing pattern for CardTrader/x402
 * live mode: documented and visible, never faked as working.
 */
export function PaymentMethodPanel({
  offerId,
  amountBaseUnits,
  payTo,
  asset,
  network,
  onSettled,
  className,
}: PaymentMethodPanelProps) {
  return (
    <div className={["border-border-subtle bg-surface rounded-md border p-4 text-sm", className ?? ""].join(" ")}>
      <p className="font-semibold">
        Pay ${usdcBaseUnitsToDisplayString(Number(amountBaseUnits))} USDC
      </p>

      <div className="mt-3 flex flex-col gap-2">
        <div className="border-accent/40 bg-background rounded-md border p-3">
          <p className="mb-2 text-xs font-semibold tracking-wide uppercase">Wallet (crypto)</p>
          <PayWithWalletButton
            offerId={offerId}
            amountBaseUnits={amountBaseUnits}
            payTo={payTo}
            asset={asset}
            network={network}
            onSettled={onSettled}
          />
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
