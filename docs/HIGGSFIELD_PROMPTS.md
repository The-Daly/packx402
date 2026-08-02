# PACK402 Higgsfield Pack Artwork

**Status: real assets generated and installed, current design (v2).** Ten of the fourteen
tiers (Spark through Mythic — every tier priced at or under $250, i.e. everything not
currently locked per `docs/LEGAL_REVIEW_REQUIRED.md`'s bankroll gate) have real
Higgsfield-generated artwork at `public/packs/{tierKey}.png`. Crown, Vault, Grail, and
Genesis remain CSS/SVG placeholders (`PackArt`'s fallback face) — they're locked in the
UI, so there's no user-facing gap. Model used: `nano_banana_pro` (Google), 1K resolution,
`2:3` aspect ratio.

This is the **second full art pass**. The first pass (wordmark-based, described in earlier
revisions of this doc) was replaced entirely after user review — see "Design history"
below for why.

## Current design (all 10 unlocked tiers)

One standardized template, only material/color and a tier-specific background motif
differ:

- A glowing **"P+X" vault-arc emblem** (a stylized "P" crossed by an "X", drawn as
  geometric arc line-work) centered on the face, inside a **corner-bracket frame** (four
  simple bracket marks, no checkmarks — an earlier draft had checkmarks in the corners,
  removed per feedback).
- **No "PackX402" wordmark anywhere on the pack face** — after repeated attempts to get
  clean, correctly-positioned baked-in text failed (see "Design history"), the wordmark
  was dropped entirely rather than keep fighting the image model's text rendering.
- The tier name in a **rounded pill badge** near the bottom — the only text on the pack.
- Jagged foil seams top and bottom, glossy cartoon/toon-shaded style, isolated cutout on a
  transparent background.
- A **tier-specific background motif** behind the emblem, distinct per tier (not just a
  color swap):

| Tier | File | Material / accent | Background motif |
|---|---|---|---|
| Spark | `spark.png` | Satin black, electric cyan (`#3FE1FF`) | Radiating cyan glow |
| Starter | `starter.png` | Brushed copper (`#C97A44`) | Sunburst rays |
| Scout | `scout.png` | Deep forest teal (`#3FA88C`) | Silver compass/radar lines |
| Bronze | `bronze.png` | Aged bronze (`#B08050`) | Art-deco fan/sunray |
| Silver | `silver.png` | Satin silver/white (`#C7CDD6`) | Diamond-facet lines |
| Gold | `gold.png` | Champagne gold (`#D4AF6A`) | Art-deco golden sunburst |
| Prism | `prism.png` | Satin black + spectral purple-blue | Holographic prism rays |
| Platinum | `platinum.png` | Ice-white platinum (`#CFE7F5`) | Icy frost-crystal facets |
| Obsidian | `obsidian.png` | Volcanic black + emerald + gold | Cracked-glass shard lines |
| Mythic | `mythic.png` | Cosmic violet-black (`#9B6FD6`) + antique gold | Starfield/nebula swirl, ornate gold trim |
| Crown/Vault/Grail/Genesis | *(placeholder)* | Not generated — locked tiers | — |

Mythic's ornate gold border is a deliberate departure from the others (it's the top
unlocked tier) — confirmed acceptable, not a bug.

Base prompt template used for tiers 2-10 (Spark generated first as the confirmed
reference, then each other tier generated fresh from the same template rather than
image-edited from Spark, to avoid compounding edit artifacts):

> Using this pack as the exact template (same P+X emblem in corner-bracket square frame,
> same jagged foil seams top and bottom, same bottom pill badge shape, same cartoon/
> toon-shaded glossy style, no wordmark text anywhere), create the {TIER} tier variant:
> {material description}. Bottom badge reads "{TIER}". Isolated cutout on a transparent
> background.

## Design history — why the wordmark was dropped

The first full art pass baked "PackX402" into every pack face as a rounded bubble-style
wordmark near the top. On review:

1. The bubble-cartoon font read as unpolished — asked for a cleaner, more modern
   geometric/fintech-style font.
2. Multiple regeneration attempts to restyle the font kept either barely changing it, or
   fixing the font but re-introducing corner checkmarks that had just been removed, or
   moving the wordmark to touch/overlap the top zigzag seam.
3. After several rounds of this, rather than keep spending generations fighting
   image-model text positioning, the wordmark was dropped entirely — the emblem moved up
   to fill the resulting space, and the tier-name badge is now the only text on the pack.
   This was explicitly confirmed as the direction to take before the current set was
   batch-generated.

## Real video-driven rip animation (Spark only so far)

Superseding the CSS clip-path rip illusion (`RipToOpen.tsx`, still used by tiers without a
video) for Spark: a real Higgsfield `kling3_0` image-to-video interpolation between two
stills —

1. **Closed still**: the tier's normal pack art, background swapped from transparent to a
   solid `#0b0d10` (matching the site's `--background`) via a `nano_banana_pro` edit —
   video generation doesn't support alpha transparency, so a matching solid background is
   the practical substitute.
2. **Torn-open still**: same edit pass, prompted for a **completely straight horizontal
   tear spanning the full width** near the top (an earlier attempt produced a
   triangular/peaked tear — corrected per feedback), flap folded back, same solid
   background.
3. **`kling3_0`** (`mode: "std"`, `sound: "off"`, `duration: 3`, `aspect_ratio: "9:16"`),
   `start_image`/`end_image` = the two stills above, prompt: "The pack tears open along a
   completely straight horizontal seam near the top, spanning the full width edge to
   edge: the top flap folds back and opens in one smooth continuous motion, revealing the
   dark empty interior. Camera locked, no camera movement, nothing else moves."

Output saved to `public/video/open/spark.mp4`; the torn-open still is also saved to
`public/packs/spark-open.png` (shown as a static frame during the brief "tearing" phase
transition). `RipToOpenVideo.tsx` maps the user's drag position directly to
`video.currentTime` — see `src/components/pack-art/rip-video-map.ts` for the tier→asset
map and `PROJECT_STATUS.md` for how it's wired into both the real opening theater and the
no-DB demo. The remaining 9 tiers need the same 3-asset pipeline (closed-solid-bg still →
torn-solid-bg still → `kling3_0` interpolation) once their base art is finalized.

## Known follow-ups

- **File size**: raw PNGs are ~1.3-1.5MB each (~14MB total for the 10 tiers) — Next.js's
  image optimizer resizes/re-encodes on request, so served bytes are much smaller, but the
  committed repo size is worth reducing (re-export as compressed PNG/WebP) before this
  matters for clone times.
- **Crown/Vault/Grail/Genesis**: not generated — regenerate once those tiers unlock.
- **9 of 10 tiers still need the video-rip treatment** — only Spark has one so far.
- **Card back, marketing variants (pedestal/3q/closeup/thumb/hero shots), other VFX
  assets**: none generated yet — see `docs/ASSET_MANIFEST.md` for the full remaining list.
