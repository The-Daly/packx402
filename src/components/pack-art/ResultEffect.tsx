"use client";

export type ResultIntensity = "standard" | "rare" | "major" | "genesis";

export interface ResultEffectProps {
  intensity: ResultIntensity;
  /** Future hook: once a real Higgsfield VFX clip exists, pass its path here to play it
   * instead of the CSS placeholder — see docs/ASSET_MANIFEST.md (pack402_vfx_*). */
  videoSrc?: string;
  active?: boolean;
  className?: string;
}

const INTENSITY_RING_COUNT: Record<ResultIntensity, number> = {
  standard: 1,
  rare: 2,
  major: 3,
  genesis: 4,
};

const INTENSITY_COLOR: Record<ResultIntensity, string> = {
  standard: "#D4AF6A",
  rare: "#D4AF6A",
  major: "#3FA88C",
  genesis: "#D4AF6A",
};

/**
 * CSS placeholder for the four result-intensity VFX layers described in the creative
 * brief (Standard / Rare / Major / Genesis). Renders BEHIND the card overlay slot — never
 * covers or obstructs the card area, matching the "production compositing rule." Swap in
 * a real rendered clip via `videoSrc` once available; the component keeps the same
 * centered-card-safe layout either way.
 */
export function ResultEffect({ intensity, videoSrc, active = true, className }: ResultEffectProps) {
  if (!active) return null;

  if (videoSrc) {
    return (
      <video
        className={[
          "pointer-events-none absolute inset-0 h-full w-full object-cover",
          className ?? "",
        ].join(" ")}
        src={videoSrc}
        autoPlay
        muted
        playsInline
        aria-hidden="true"
      />
    );
  }

  const ringCount = INTENSITY_RING_COUNT[intensity];
  const color = INTENSITY_COLOR[intensity];

  return (
    <div
      className={[
        "pointer-events-none absolute inset-0 flex items-center justify-center",
        className ?? "",
      ].join(" ")}
      aria-hidden="true"
      data-intensity={intensity}
    >
      {Array.from({ length: ringCount }).map((_, i) => (
        <span
          key={i}
          className="result-effect-ring absolute rounded-full"
          style={{
            borderColor: color,
            animationDelay: `${i * 0.25}s`,
          }}
        />
      ))}
      {intensity === "genesis" && <span className="result-effect-eclipse absolute rounded-full" />}
      {(intensity === "major" || intensity === "genesis") && (
        <>
          <span className="result-effect-column absolute -left-6" />
          <span className="result-effect-column absolute -right-6" />
        </>
      )}
    </div>
  );
}
