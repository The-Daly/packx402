# Higgsfield Pack Artwork Prompts

**No images have been generated in this session.** This document specifies the prompts to
use with an image-generation tool; `public/packs/placeholders/` (see below) holds
correctly-named/dimensioned development placeholders only.

## Base prompt (all tiers)

> Premium vertical collectible-card mystery pack, entirely original branding, PACKX402
> geometric wordmark, sealed metallic foil wrapper, centered tier emblem, dark
> collector-vault aesthetic, sophisticated holographic highlights, studio product
> photography, isolated front-facing product, consistent proportions, no hands, no
> existing trading-card characters, no Pokémon, no Yu-Gi-Oh, no existing logos, no
> copyrighted creatures.

## Tier treatments (append to the base prompt)

| Tier     | Treatment                      |
| -------- | ------------------------------ |
| Spark    | electric cyan                  |
| Starter  | brushed copper                 |
| Scout    | forest teal                    |
| Bronze   | aged bronze                    |
| Silver   | satin silver                   |
| Gold     | restrained gold                |
| Prism    | spectral foil                  |
| Platinum | ice-white platinum             |
| Obsidian | volcanic black                 |
| Mythic   | cosmic violet                  |
| Crown    | royal black and gold           |
| Vault    | emerald security engraving     |
| Grail    | ivory and antique gold         |
| Genesis  | black diamond and aurora edges |

## Output spec

- Vertical, 3:4 aspect ratio (matches the placeholder `aspect-[3/4]` used throughout the
  UI in `src/app/packs/page.tsx` and `src/app/packs/[tierKey]/page.tsx`).
- Filename convention: `public/packs/{tierKey}.png` (e.g. `public/packs/spark.png`).
- Transparent or dark-vault background consistent with the site's dark theme
  (`src/app/globals.css` `--background: #0b0d10`).

## Development placeholders

No placeholder image files were generated in this session (no image-generation tool was
invoked). The UI currently renders a CSS gradient (`bg-gradient-to-br from-surface-raised
to-background`) in place of pack artwork wherever an image would go — see the `aspect-[3/4]`
divs in the marketplace/detail/landing pages. Replace those divs with an `<Image
src="/packs/{tierKey}.png" ... />` once real artwork exists.
