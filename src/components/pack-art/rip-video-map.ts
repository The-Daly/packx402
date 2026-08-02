import type { PackTierKey } from "@/server/config/pack-tiers";

/**
 * Real Higgsfield-generated rip-open videos exist for these tiers only so far (see
 * docs/HIGGSFIELD_PROMPTS.md) — everything else falls back to the CSS clip-path rip
 * (RipToOpen) until the same treatment is produced for the remaining tiers. Shared
 * between the real opening theater (OpenPackClient) and the no-DB demo
 * (InteractivePackDemo) so both stay in sync as more tiers get a video.
 */
export const RIP_VIDEO_BY_TIER: Partial<Record<PackTierKey, { video: string; openStill: string }>> = {
  spark: { video: "/video/open/spark.mp4", openStill: "/packs/spark-open.png" },
  starter: { video: "/video/open/starter.mp4", openStill: "/packs/starter-open.png" },
  scout: { video: "/video/open/scout.mp4", openStill: "/packs/scout-open.png" },
  bronze: { video: "/video/open/bronze.mp4", openStill: "/packs/bronze-open.png" },
  silver: { video: "/video/open/silver.mp4", openStill: "/packs/silver-open.png" },
  gold: { video: "/video/open/gold.mp4", openStill: "/packs/gold-open.png" },
  prism: { video: "/video/open/prism.mp4", openStill: "/packs/prism-open.png" },
};
