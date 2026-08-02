"use client";

import { useState } from "react";
import Image from "next/image";

export interface CardBackProps {
  /** Explicit override. Defaults to `/cards/pack402-card-back.png` per docs/ASSET_MANIFEST.md. */
  imageSrc?: string;
  angle?: "front" | "three-quarter";
  className?: string;
  priority?: boolean;
}

/**
 * The generic PACK402 card back shown during a reveal before the authentic card is known,
 * and as the fallback face whenever a resolved card image is unavailable (see
 * src/server/card-images/resolver.ts — a missing image never changes the selected card,
 * it only changes what's rendered for it).
 */
export function CardBack({
  imageSrc,
  angle = "front",
  className,
  priority = false,
}: CardBackProps) {
  const [failed, setFailed] = useState(false);
  const resolvedSrc = imageSrc ?? "/cards/pack402-card-back.png";

  return (
    <div
      className={[
        "relative aspect-[5/7] w-full overflow-hidden rounded-lg",
        angle === "three-quarter" ? "[transform:perspective(800px)_rotateY(18deg)]" : "",
        className ?? "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {!failed ? (
        <Image
          src={resolvedSrc}
          alt="PACK402 card back"
          fill
          priority={priority}
          sizes="(max-width: 640px) 60vw, 280px"
          className="object-cover"
          onError={() => setFailed(true)}
        />
      ) : (
        <CardBackFallback />
      )}
    </div>
  );
}

function CardBackFallback() {
  return (
    <div
      role="img"
      aria-label="PACK402 card back"
      className="relative flex h-full w-full flex-col items-center justify-center gap-3 border-2"
      style={{
        background: "linear-gradient(160deg, #0a0c0e 0%, #12211c 60%, #0a0c0e 100%)",
        borderColor: "#D4AF6A",
      }}
    >
      {/* Four verification corners */}
      {[
        "top-2 left-2 border-t border-l",
        "top-2 right-2 border-t border-r",
        "bottom-2 left-2 border-b border-l",
        "bottom-2 right-2 border-b border-r",
      ].map((pos) => (
        <span key={pos} className={`border-accent/70 absolute h-3 w-3 ${pos}`} />
      ))}
      <svg width="36" height="36" viewBox="0 0 44 44" fill="none" aria-hidden="true">
        <circle cx="22" cy="22" r="12" stroke="#D4AF6A" strokeWidth="1.25" opacity="0.6" />
        <path
          d="M17 30V14h6a5 5 0 0 1 0 10h-6"
          stroke="#D4AF6A"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <p className="text-accent text-xs font-semibold tracking-[0.25em]">PACK402</p>
    </div>
  );
}
