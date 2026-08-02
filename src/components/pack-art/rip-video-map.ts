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
};
