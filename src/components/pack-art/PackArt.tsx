"use client";

import { useState } from "react";
import Image from "next/image";
import type { PackTierKey } from "@/server/config/pack-tiers";
import { getTierTreatment } from "./tier-treatments";
import { usdcBaseUnitsToDisplayString } from "@/shared/money";

export type PackArtSize = "thumbnail" | "card" | "hero" | "detail";

export interface PackArtProps {
  tierKey: PackTierKey;
  tierName: string;
  /** Price in integer USDC base units — never a pre-formatted string, per project money rules. */
  price: number;
  accentColor?: string;
  material?: string;
  /** Explicit override. Defaults to `/packs/{tierKey}.png` per docs/ASSET_MANIFEST.md. */
  imageSrc?: string;
  priority?: boolean;
  size?: PackArtSize;
  locked?: boolean;
  featured?: boolean;
  animationState?: "idle" | "opening" | "opened";
  /** Shows the tier's torn-open art variant (`/packs/{tierKey}-torn.png`) instead of the
   * closed-pack art — used for the brief moment right after the rip gesture commits, before
   * the reveal wheel spins. Falls back to the closed-pack art if no torn variant exists yet
   * for this tier (see docs/ASSET_MANIFEST.md — not every tier has one). */
  torn?: boolean;
  className?: string;
}

const SIZE_SIZES_ATTR: Record<PackArtSize, string> = {
  thumbnail: "(max-width: 640px) 45vw, 180px",
  card: "(max-width: 640px) 90vw, (max-width: 1024px) 45vw, 320px",
  hero: "(max-width: 1024px) 90vw, 480px",
  detail: "(max-width: 1024px) 90vw, 560px",
};

/**
 * Locked 2:3 vertical pack face, used consistently across the marketplace, landing page,
 * pack detail, opening screen, collection, and social posts. Attempts to load the real
 * asset at `/packs/{tierKey}.png` (see docs/ASSET_MANIFEST.md); on any load failure or
 * when no real asset exists yet, renders a polished tier-branded CSS placeholder instead
 * of a broken image or an empty box. Swapping in real Higgsfield renders requires no code
 * changes — just adding the file at the documented path.
 */
export function PackArt({
  tierKey,
  tierName,
  price,
  accentColor,
  material,
  imageSrc,
  priority = false,
  size = "card",
  locked = false,
  featured = false,
  animationState = "idle",
  torn = false,
  className,
}: PackArtProps) {
  const [imageFailed, setImageFailed] = useState(false);
  const [tornImageFailed, setTornImageFailed] = useState(false);
  const treatment = getTierTreatment(tierKey);
  const resolvedAccent = accentColor ?? treatment.accentColor;
  const baseSrc = imageSrc ?? `/packs/${tierKey}.png`;
  const showTorn = torn && !tornImageFailed;
  const resolvedSrc = showTorn ? `/packs/${tierKey}-torn.png` : baseSrc;
  const showRealImage = !imageFailed;

  const altText = `${tierName} pack — PACK402, Only the Best Packx${locked ? " (locked)" : ""}`;

  return (
    <div
      className={[
        "pack-art relative aspect-[2/3] w-full overflow-hidden rounded-xl",
        featured ? "ring-accent/40 ring-1" : "",
        animationState === "opening" ? "pack-art-opening" : "",
        animationState === "opened" ? "opacity-0 transition-opacity duration-500" : "",
        className ?? "",
      ]
        .filter(Boolean)
        .join(" ")}
      data-tier={tierKey}
      data-animation-state={animationState}
      style={{ "--pack-accent": resolvedAccent } as React.CSSProperties}
    >
      {showRealImage && (
        <Image
          src={resolvedSrc}
          alt={altText}
          fill
          priority={priority}
          sizes={SIZE_SIZES_ATTR[size]}
          className="object-cover"
          onError={() => (showTorn ? setTornImageFailed(true) : setImageFailed(true))}
        />
      )}

      {!showRealImage && (
        <PackArtFallback
          tierKey={tierKey}
          tierName={tierName}
          price={price}
          material={material ?? treatment.label}
          treatment={treatment}
        />
      )}

      {locked && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <span className="rounded-full border border-white/30 bg-black/60 px-3 py-1 text-[11px] font-medium tracking-wide text-white uppercase">
            Locked
          </span>
        </div>
      )}
    </div>
  );
}

function PackArtFallback({
  tierKey,
  tierName,
  price,
  material,
  treatment,
}: {
  tierKey: PackTierKey;
  tierName: string;
  price: number;
  material: string;
  treatment: ReturnType<typeof getTierTreatment>;
}) {
  return (
    <div
      title={material}
      className="pack-art-fallback relative flex h-full w-full flex-col items-center justify-between px-4 py-6 text-center"
      style={{
        background: treatment.foilGradient,
        boxShadow: `inset 0 0 60px 10px ${treatment.glow}`,
        color: treatment.textColor,
      }}
    >
      {/* Seams */}
      <div className="pointer-events-none absolute inset-x-3 top-3 h-px bg-white/15" />
      <div className="pointer-events-none absolute inset-x-3 bottom-3 h-px bg-white/10" />
      {/* Foil sheen sweep */}
      <div
        className="pack-art-sheen pointer-events-none absolute inset-0"
        style={{ ["--sheen-color" as string]: treatment.accentColor }}
      />

      {/* Crest */}
      <div className="relative z-10 mt-2 flex flex-col items-center gap-2">
        <PackCrest color={treatment.accentColor} />
      </div>

      {/* Brand lockup — the "Only the Best Packx" slogan is a site-level tagline (see
          SiteHeader/landing hero), deliberately not repeated on every individual pack face. */}
      <div className="relative z-10 flex flex-col items-center gap-1">
        <p
          className="text-sm font-semibold tracking-[0.2em]"
          style={{ color: treatment.accentColor }}
        >
          PACK402
        </p>
      </div>

      {/* Tier + price */}
      <div className="relative z-10 flex flex-col items-center gap-0.5">
        <p className="text-base font-semibold">{tierName}</p>
        <p className="text-sm opacity-85">${usdcBaseUnitsToDisplayString(price)}</p>
      </div>

      <span className="sr-only">
        Development placeholder artwork for the {tierKey} tier — not final Higgsfield-generated art.
      </span>
    </div>
  );
}

function PackCrest({ color }: { color: string }) {
  return (
    <svg
      width="44"
      height="44"
      viewBox="0 0 44 44"
      fill="none"
      aria-hidden="true"
      className="pack-art-crest"
    >
      {/* Four corner verification marks */}
      <path d="M2 10V2h8" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      <path d="M42 10V2h-8" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      <path d="M2 34v8h8" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      <path d="M42 34v8h-8" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      {/* Vault-geometry ring */}
      <circle cx="22" cy="22" r="12" stroke={color} strokeWidth="1.25" opacity="0.55" />
      {/* Stylized P */}
      <path
        d="M17 30V14h6a5 5 0 0 1 0 10h-6"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
