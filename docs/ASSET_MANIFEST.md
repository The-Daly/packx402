# PACK402 Asset Manifest

**Status: 10 of 14 tiers have real Higgsfield-generated art**, installed at
`public/packs/{tierKey}.png` — Spark, Starter, Scout, Bronze, Silver, Gold, Prism,
Platinum, Obsidian, Mythic. See `docs/HIGGSFIELD_PROMPTS.md` for exactly how each was
generated. Crown, Vault, Grail, and Genesis are still branded CSS/SVG development
placeholders rendered by `src/components/pack-art/*` (see `PackArt.tsx`'s fallback face)
— those four tiers are locked in the UI (bankroll gate, see
`docs/LEGAL_REVIEW_REQUIRED.md`), so this is not a user-facing gap today. The card back,
all marketing-variant shots, and every video/VFX asset below remain placeholders. This
document is also the reference for dropping in the remaining real assets with **zero code
changes** — every consuming component already resolves art from these locations first and
only falls back to CSS if the file is missing or fails to load.

**Real video-driven rip animation: 1 of 14 tiers (Spark)** has an actual Higgsfield-
generated tear-open video at `public/video/open/spark.mp4`, plus a matching torn-open
still at `public/packs/spark-open.png` shown during the brief phase transition right after
the video finishes. `RipToOpenVideo.tsx` maps the user's drag position directly to
`video.currentTime` — this is a real interactive animation the user scrubs through, not a
CSS illusion. See `docs/HIGGSFIELD_PROMPTS.md` for the exact generation pipeline
(closed-still + torn-still → `kling3_0` image-to-video interpolation) and
`src/components/pack-art/rip-video-map.ts` for the tier→asset map. Any tier not in that
map (9 of 10 unlocked tiers, for now) falls back to the older CSS clip-path rip
(`RipToOpen.tsx` + `PackArt`'s `torn` prop, which requests `/packs/{tierKey}-torn.png` and
falls back silently to the closed-pack art if missing) — this is a drop-in, per-tier
rollout, not an all-or-nothing swap.

## How the fallback system works

- `PackArt` (`src/components/pack-art/PackArt.tsx`) requests `/packs/{tierKey}.png` via
  `next/image`. On any load error (including "file doesn't exist," a 404), it renders a
  tier-branded CSS face instead — see `tier-treatments.ts` for the per-tier colors.
- `CardBack` requests `/cards/pack402-card-back.png` with the same fallback pattern.
- `ResultEffect` accepts an optional `videoSrc`; when omitted it renders a CSS-only
  placeholder effect layer.
- `OpeningStage` accepts optional `idleVideoSrc`/`openingVideoSrc` props for the same
  reason.

## Still images

All packs share **locked 2:3 vertical proportions** as the canonical in-app format
(`aspect-[2/3]` throughout the UI). Additional formats below are for marketing/export use.

| Asset                                                   | Path                                                   | Dimensions      | Notes                                                     |
| ------------------------------------------------------- | ------------------------------------------------------ | --------------- | --------------------------------------------------------- |
| Brand crest + logo lockup (champagne-gold, transparent) | `/public/brand/pack402_brand_crest_v01.png`            | 2048×2048       | Crest + "PACK402" wordmark + "Only the Best Packx" slogan |
| Logo lockup — ivory variant                             | `/public/brand/pack402_brand_crest_ivory_v01.png`      | 2048×2048       |                                                           |
| Logo lockup — black monochrome                          | `/public/brand/pack402_brand_crest_mono_v01.png`       | 2048×2048       |                                                           |
| Logo lockup — horizontal layout                         | `/public/brand/pack402_brand_crest_horizontal_v01.png` | 3072×1024       |                                                           |
| PACK402 card back (front)                               | `/public/cards/pack402_card_back_v01.png`              | 1470×2058 (5:7) | Used by `CardBack.tsx` at `/cards/pack402-card-back.png`  |
| Card back — three-quarter angle                         | `/public/cards/pack402_card_back_3q_v01.png`           | 1470×2058       |                                                           |

### Per-tier pack art (14 tiers × 6 shots each = 84 stills)

For each `{tier}` in `spark, starter, scout, bronze, silver, gold, prism, platinum,
obsidian, mythic, crown, vault, grail, genesis`:

| Shot                                                                         | Path used by the app                          | Marketing filename                 | Dimensions       |
| ---------------------------------------------------------------------------- | --------------------------------------------- | ---------------------------------- | ---------------- |
| Isolated front-facing (**primary — this is the one the app actually loads**) | `/public/packs/{tier}.png`                    | `pack402_pack_{tier}_front_v01`    | 2048×3072 (2:3), **done for spark/starter/scout/bronze/silver/gold/prism/platinum/obsidian/mythic** |
| On black-marble pedestal                                                     | `/public/packs/marketing/{tier}_pedestal.png` | `pack402_pack_{tier}_pedestal_v01` | 2048×3072        |
| Three-quarter angle                                                          | `/public/packs/marketing/{tier}_3q.png`       | `pack402_pack_{tier}_3q_v01`       | 2048×3072        |
| Foil/engraving close-up                                                      | `/public/packs/marketing/{tier}_closeup.png`  | `pack402_pack_{tier}_closeup_v01`  | 2048×2048        |
| Mobile marketplace thumbnail                                                 | `/public/packs/marketing/{tier}_thumb.png`    | `pack402_pack_{tier}_thumb_v01`    | 512×768          |
| Website hero (wide)                                                          | `/public/packs/marketing/{tier}_hero.png`     | `pack402_pack_{tier}_hero_v01`     | 1920×1080 (16:9) |

Only `/public/packs/{tier}.png` is wired into the running app today (`PackArt`
component). The marketing variants are documented for the eventual marketing/export
pipeline but have no consuming code yet.

## Video / motion assets

None of these are wired to any player yet beyond the optional `videoSrc`/`idleVideoSrc`/
`openingVideoSrc` props on `PackArt`, `OpeningStage`, and `ResultEffect` — passing a path
activates it; omitting it (today's state) uses the CSS placeholder.

| Asset                             | Suggested path                          | Filename                          | Duration          | Dimensions                                 |
| --------------------------------- | --------------------------------------- | --------------------------------- | ----------------- | ------------------------------------------ |
| Idle loop (per tier)              | `/public/video/idle/{tier}.mp4`         | `pack402_idle_{tier}_v01`         | 3s, seamless loop | 1920×1080                                  |
| Single-pack opening (per tier)    | `/public/video/open/{tier}.mp4`         | `pack402_open_single_{tier}_v01`  | 3s                | 720×1280 (9:16), **done for spark**        |
| Four-pack opening                 | `/public/video/open/four.mp4`           | `pack402_open_four_v01`           | 11s               | 1920×1080                                  |
| Four-pack major-hit, top-left     | `/public/video/open/four_major_tl.mp4`  | `pack402_open_four_major_tl_v01`  | 11s               | 1920×1080                                  |
| Four-pack major-hit, top-right    | `/public/video/open/four_major_tr.mp4`  | `pack402_open_four_major_tr_v01`  | 11s               | 1920×1080                                  |
| Four-pack major-hit, bottom-left  | `/public/video/open/four_major_bl.mp4`  | `pack402_open_four_major_bl_v01`  | 11s               | 1920×1080                                  |
| Four-pack major-hit, bottom-right | `/public/video/open/four_major_br.mp4`  | `pack402_open_four_major_br_v01`  | 11s               | 1920×1080                                  |
| Standard-hit VFX layer            | `/public/video/vfx/standard.mp4`        | `pack402_vfx_standard_v01`        | 2s                | 1920×1080, alpha/screen-blend if supported |
| Rare-hit VFX layer                | `/public/video/vfx/rare.mp4`            | `pack402_vfx_rare_v01`            | 2.5s              | 1920×1080                                  |
| Major-hit VFX layer               | `/public/video/vfx/major.mp4`           | `pack402_vfx_major_v01`           | 3s                | 1920×1080                                  |
| Genesis-hit VFX layer             | `/public/video/vfx/genesis.mp4`         | `pack402_vfx_genesis_v01`         | 3.5s              | 1920×1080                                  |
| Reduced-motion opening            | `/public/video/open/reduced-motion.mp4` | `pack402_open_reduced_motion_v01` | <3s               | 1920×1080                                  |
| Website hero background loop      | `/public/video/hero-loop.mp4`           | `pack402_website_hero_loop_v01`   | 8s, seamless loop | 1920×1080                                  |
| Social pull-share clip            | `/public/video/social/pull-share.mp4`   | `pack402_social_pull_v01`         | 6s                | 1080×1920 (9:16)                           |

`ResultEffect`'s `intensity` prop (`standard | rare | major | genesis`) maps 1:1 to the VFX
rows above.

## File-naming convention (marketing/export pipeline)

The user-specified naming system (`pack402_brand_crest_v01`, `pack402_pack_{tier}_front_v01`,
etc.) is preserved as the canonical export name. The app-facing paths in the tables above
are the actual paths the Next.js code reads from `/public`; rename on export from
whatever pipeline produces the final files, or add a build step that copies/renames from
the marketing naming convention into these paths.

## Generation order (unchanged from creative brief)

1. Brand crest + logo lockup
2. Master Obsidian pack (`obsidian.png`) — the structural/lighting reference for all other tiers
3. PACK402 card back
4. Remaining 13 tier stills, matched exactly to the Obsidian reference's proportions, seams, crest placement, and lighting
5. Idle loop (start with Obsidian, then per-tier)
6. Single-pack opening master (Obsidian), then per-tier
7. VFX layers: standard → rare → major → genesis
8. Four-pack opening + four major-hit positional variants
9. Reduced-motion opening
10. Website hero loop
11. Social sharing clip

## Generation status

Higgsfield image generation is working on the current "starter" plan at up to 2K
resolution (4K specifically requires a Plus-tier plan — 2K is what was used throughout).
Concurrency is capped at 4 simultaneous jobs on this plan; batch requests accordingly.
Remaining work: card back, Crown/Vault/Grail/Genesis tier art (once unlocked), all
marketing-variant shots, and all video/VFX assets.
