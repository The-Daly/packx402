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

const CATALOG_FETCH_TIMEOUT_MS = 5000;

async function fetchWithTimeout(url: string): Promise<Response | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), CATALOG_FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) return null;
    return res;
  } catch {
    return null; // network error, timeout, or abort — treated as "this provider found nothing"
  } finally {
    clearTimeout(timeout);
  }
}

async function resolvePokemonTcgApi(input: CardImageResolverInput): Promise<ProviderResult | null> {
  const query = encodeURIComponent(`name:"${input.cardName}"`);
  const res = await fetchWithTimeout(`https://api.pokemontcg.io/v2/cards?q=${query}&pageSize=1`);
  if (!res) return null;
  const body = await res.json().catch(() => null);
  const imageUrl: string | undefined = body?.data?.[0]?.images?.large ?? body?.data?.[0]?.images?.small;
  if (!imageUrl) return null;
  return {
    imageUrl,
    imageType: "CATALOG_RENDER",
    provider: "pokemon_tcg",
    attribution: "Card image via the Pokémon TCG API (pokemontcg.io).",
  };
}

async function resolveYgoprodeckApi(input: CardImageResolverInput): Promise<ProviderResult | null> {
  const query = encodeURIComponent(input.cardName);
  const res = await fetchWithTimeout(`https://db.ygoprodeck.com/api/v7/cardinfo.php?name=${query}`);
  if (!res) return null;
  const body = await res.json().catch(() => null);
  const imageUrl: string | undefined = body?.data?.[0]?.card_images?.[0]?.image_url;
  if (!imageUrl) return null;
  return {
    imageUrl,
    imageType: "CATALOG_RENDER",
    provider: "ygoprodeck",
    attribution: "Card image via YGOPRODeck (ygoprodeck.com).",
  };
}

/**
 * Provider 4: the public Pokemon TCG API (pokemontcg.io) or YGOPRODeck API, keyed by card
 * game. Free, keyless, public catalog APIs — still CATALOG_RENDER (a catalog stand-in,
 * not a photo of the specific physical card being shipped), still requires the domain
 * allowlist check on whatever URL comes back before it's ever rendered. Any network
 * failure, timeout, or unrecognized response shape resolves to null here — the caller
 * falls through to the PLACEHOLDER fallback rather than throwing.
 */
async function resolvePublicCatalogApi(
  input: CardImageResolverInput,
): Promise<ProviderResult | null> {
  if (input.cardGame === "pokemon") return resolvePokemonTcgApi(input);
  if (input.cardGame === "yugioh") return resolveYgoprodeckApi(input);
  return null;
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

/**
 * Batch variant of resolveCardImage — used to pre-resolve images for every entry in a
 * pack's pool (not just the winner) so the spin animation (CardRevealWheel) can cycle
 * through what the pack could actually contain, instead of generic card-back
 * placeholders. Resolves all entries concurrently; a failure on one entry never affects
 * the others (each independently falls back to PLACEHOLDER via resolveCardImage).
 */
export async function resolveCardImages(
  inputs: CardImageResolverInput[],
): Promise<ResolvedCardImage[]> {
  return Promise.all(inputs.map((input) => resolveCardImage(input)));
}

export { isAllowedImageUrl };
