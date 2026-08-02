"use client";

import { PackArt } from "./PackArt";
import type { PackTierKey } from "@/server/config/pack-tiers";
import { usdcBaseUnitsToDisplayString } from "@/shared/money";

export interface PackShelfItem {
  tierKey: PackTierKey;
  tierName: string;
  price: number;
  locked?: boolean;
}

export interface PackShelfProps {
  items: PackShelfItem[];
  selectedTierKey?: PackTierKey;
  onSelect: (item: PackShelfItem) => void;
  className?: string;
}

/**
 * Shop-style pack shelf: every pack renders at the same size (no depth/scale falloff —
 * that's PackCarousel's job elsewhere), laid out left-to-right in ascending price order
 * (cheapest on the far left, priciest on the far right), each with its own price/pay
 * button underneath. A plain horizontally-scrollable row with CSS scroll-snap — no
 * infinite wrap, no centered-item illusion, just a shelf you scroll along.
 */
export function PackShelf({ items, selectedTierKey, onSelect, className }: PackShelfProps) {
  const sorted = [...items].sort((a, b) => a.price - b.price);

  return (
    <div
      className={["flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2", className ?? ""].join(
        " ",
      )}
      role="list"
      aria-label="Pack tiers, lowest price first"
    >
      {sorted.map((item) => (
        <div
          key={item.tierKey}
          role="listitem"
          className={[
            "w-36 shrink-0 snap-start rounded-lg border p-2 transition sm:w-40",
            item.tierKey === selectedTierKey
              ? "border-accent bg-surface"
              : "border-border-subtle hover:border-accent/40",
          ].join(" ")}
        >
          <button
            type="button"
            onClick={() => onSelect(item)}
            className="block w-full text-left"
            aria-label={`Select ${item.tierName} pack`}
          >
            <PackArt
              tierKey={item.tierKey}
              tierName={item.tierName}
              price={item.price}
              locked={item.locked}
              size="thumbnail"
            />
          </button>
          <button
            type="button"
            onClick={() => onSelect(item)}
            disabled={item.locked}
            className="bg-accent text-accent-foreground hover:bg-accent-strong disabled:bg-border-subtle disabled:text-muted mt-2 w-full rounded-md px-2 py-1.5 text-xs font-semibold disabled:cursor-not-allowed"
          >
            {item.locked ? "Locked" : `$${usdcBaseUnitsToDisplayString(item.price)}`}
          </button>
        </div>
      ))}
    </div>
  );
}
