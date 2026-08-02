"use client";

import { useState } from "react";
import Image from "next/image";
import { CardBack } from "./CardBack";
import { cardImageDisclaimer, type ResolvedCardImage } from "@/shared/card-image";

export interface CardOverlaySlotProps {
  cardName: string;
  /**
   * Result of the server-side CardImageResolver (see src/server/card-images/resolver.ts).
   * `null`/`undefined` while still loading or resolving — renders the PACK402 card back,
   * never a blank void. A resolution failure NEVER changes which card was won; it only
   * changes what image represents it (falls back to the card back).
   */
  resolved?: ResolvedCardImage | null;
  loading?: boolean;
  className?: string;
}

/**
 * The blank card-overlay target used during and after the opening animation. Per the
 * production-compositing rule, the animation itself always ends on a blank card face —
 * this component is what actually paints the resolved authentic card image on top of
 * that blank target once fairness has completed.
 */
export function CardOverlaySlot({
  cardName,
  resolved,
  loading = false,
  className,
}: CardOverlaySlotProps) {
  const [imageFailed, setImageFailed] = useState(false);

  if (loading || !resolved) {
    return (
      <div className={["relative aspect-[5/7] w-full", className ?? ""].join(" ")}>
        <CardBack />
      </div>
    );
  }

  const showFallback = imageFailed || resolved.imageType === "PLACEHOLDER";

  return (
    <div className={["flex flex-col gap-2", className ?? ""].join(" ")}>
      <div className="relative aspect-[5/7] w-full overflow-hidden rounded-lg">
        {!showFallback ? (
          <Image
            src={resolved.imageUrl}
            alt={`${cardName} card image`}
            fill
            sizes="(max-width: 640px) 60vw, 280px"
            className="object-cover"
            onError={() => setImageFailed(true)}
          />
        ) : (
          <CardBack />
        )}
      </div>
      {!showFallback && (
        <p className="text-muted text-center text-xs">
          {cardImageDisclaimer(resolved)}
          {resolved.attribution ? ` ${resolved.attribution}` : ""}
        </p>
      )}
    </div>
  );
}
