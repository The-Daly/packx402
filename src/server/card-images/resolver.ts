import type { CardImageProvider, CardImageType, ResolvedCardImage } from "@/shared/card-image";

/**
 * Domain allowlist for any provider that resolves to an external image URL. A resolved
 * URL failing this check is treated as a resolution failure (falls through to the next
 * provider, ultimately to PLACEHOLDER) — never rendered directly. Guards against a
 * compromised/misconfigured provider handing back an SSRF-style internal URL or an
 * arbitrary third-party host.
 */
const ALLOWED_IMAGE_HOSTS = new Set([
  "cardtrader.com",
  "images.cardtrader.com",
  "www.psacard.com",
  "images.pokemontcg.io",
  "ygoprodeck.com",
  "images.ygoprodeck.com",
]);

function isAllowedImageUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:") return false;
    return ALLOWED_IMAGE_HOSTS.has(parsed.hostname);
  } catch {
    return false;
  }
}

export interface CardImageResolverInput {
  cardGame: "pokemon" | "yugioh" | "other";
  cardName: string;
  setName: string;
  cardNumber: string;
  /** Only EXACT_SUPPLIER_PHOTO may use this — never a generic catalog shot of the card. */
  supplierListingId: string | null;
  supplierImageUsePermitted: boolean;
  /** PSA certification number on the physical item actually being shipped, if graded. */
  certificationNumber: string | null;
}

interface ProviderResult {
  imageUrl: string;
  imageType: CardImageType;
  provider: CardImageProvider;
  attribution: string | null;
}

/**
 * Provider 1: the supplier's own photo of the exact physical card being shipped. Highest
 * trust tier (EXACT_SUPPLIER_PHOTO) because it's a photo of the actual item, not a
 * catalog stand-in — but only usable when the supplier's listing terms permit image reuse
 * (`supplierImageUsePermitted`), independent of whether a photo exists.
 *
 * Mock mode (no live CardTrader photo-fetch credential available in this environment):
 * returns null — there is no real photo to serve, and serving a fabricated one would
 * misrepresent what's real vs. placeholder. A live integration plugs in a real fetch here
 * against the CardTrader product-photo endpoint, still gated by the same permission check.
 */
async function resolveSupplierPhoto(input: CardImageResolverInput): Promise<ProviderResult | null> {
  if (!input.supplierListingId || !input.supplierImageUsePermitted) return null;
  return null; // no live CardTrader photo endpoint wired up yet — see docs/DECISIONS.md
}

/**
 * Provider 2: a PSA population/cert lookup image for a graded card. Second-highest trust
 * (EXACT_GRADED_SCAN) — a scan of the specific graded holder, tied to a cert number.
 *
 * Mock mode: no live PSA API credential available — returns null rather than fabricating
 * a cert lookup.
 */
async function resolvePsaCertScan(input: CardImageResolverInput): Promise<ProviderResult | null> {
  if (!input.certificationNumber) return null;
  return null; // no live PSA credential wired up yet — see docs/DECISIONS.md
}

/**
 * Provider 3: CardTrader's catalog blueprint image for this card/set/number (not a photo
 * of the specific physical item — CATALOG_RENDER, always disclosed as such via
 * `cardImageDisclaimer()`).
 *
 * Mock mode: no live CardTrader catalog credential — returns null.
 */
async function resolveCardTraderCatalog(): Promise<ProviderResult | null> {
  return null; // no live CardTrader catalog endpoint wired up yet — see docs/DECISIONS.md
}

/**
 * Provider 4: the public Pokemon TCG API (pokemontcg.io) or YGOPRODeck API, keyed by card
 * game. Free, keyless, public catalog APIs — still CATALOG_RENDER, still requires the
 * domain allowlist check on whatever URL comes back before it's ever rendered.
 *
 * Mock mode: this environment has no outbound network access for live fetches, so this
 * also returns null. A live deployment can call the real endpoint here; the allowlist
 * check in `isAllowedImageUrl()` already guards the result regardless.
 */
async function resolvePublicCatalogApi(): Promise<ProviderResult | null> {
  return null; // no outbound network fetch performed in this environment
}

/**
 * Final, always-succeeds fallback: the generic PackX402 card back. Never leaves the caller
 * without an image — CardOverlaySlot renders this directly, but resolveCardImage still
 * returns it explicitly so callers get one consistent, fully-typed result shape regardless
 * of how resolution went.
 */
function fallbackResult(): ProviderResult {
  return {
    imageUrl: "/cards/pack402-card-back.png",
    imageType: "PLACEHOLDER",
    provider: "packx402_fallback",
    attribution: null,
  };
}

const PROVIDER_CHAIN: Array<
  (input: CardImageResolverInput) => Promise<ProviderResult | null>
> = [resolveSupplierPhoto, resolvePsaCertScan, resolveCardTraderCatalog, resolvePublicCatalogApi];

/**
 * CardImageResolver (spec: "Authentic card-image architecture"). Tries each provider in
 * priority order — supplier photo of the exact item, then PSA graded scan, then
 * CardTrader catalog, then public catalog APIs — and falls back to the generic PackX402
 * card back if none resolve. A resolution failure at any step NEVER changes which card
 * was actually won by the fairness engine; it only changes what image represents it.
 */
export async function resolveCardImage(
  input: CardImageResolverInput,
): Promise<ResolvedCardImage> {
  for (const provider of PROVIDER_CHAIN) {
    const result = await provider(input);
    if (!result) continue;
    if (!isAllowedImageUrl(result.imageUrl)) continue; // SSRF/allowlist guard
    return {
      imageUrl: result.imageUrl,
      imageType: result.imageType,
      provider: result.provider,
      attribution: result.attribution,
      isExactItem: result.imageType === "EXACT_SUPPLIER_PHOTO" || result.imageType === "EXACT_GRADED_SCAN",
      fallbackUsed: false,
    };
  }

  const fallback = fallbackResult();
  return {
    imageUrl: fallback.imageUrl,
    imageType: fallback.imageType,
    provider: fallback.provider,
    attribution: fallback.attribution,
    isExactItem: false,
    fallbackUsed: true,
  };
}

export { isAllowedImageUrl };
