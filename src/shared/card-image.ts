/**
 * Shared (client + server safe) types for the authentic card-image architecture. Kept
 * dependency-free so client components can import the shape without pulling in
 * server-only resolver code.
 */

export type CardImageType =
  "EXACT_SUPPLIER_PHOTO" | "EXACT_GRADED_SCAN" | "CATALOG_RENDER" | "PLACEHOLDER";

export type CardImageProvider =
  "supplier_listing" | "psa" | "cardtrader" | "pokemon_tcg" | "ygoprodeck" | "packx402_fallback";

/** Full persisted record shape (spec: "Authentic card-image architecture"). */
export interface CardImageRecord {
  cardId: string;
  game: "pokemon" | "yugioh" | "other";
  setName: string;
  setCode: string | null;
  cardNumber: string;
  supplierListingId: string | null;
  provider: CardImageProvider;
  providerCardId: string | null;
  certificationNumber: string | null;
  originalSourceUrl: string | null;
  storedAssetUrl: string;
  imageType: CardImageType;
  attribution: string | null;
  retrievedAt: string; // ISO timestamp
  lastValidatedAt: string; // ISO timestamp
  checksum: string; // sha256 hex of the stored asset bytes
  usageStatus: "active" | "stale" | "revoked";
}

/** Return shape of resolveCardImage() (spec section: CardImageResolver). */
export interface ResolvedCardImage {
  imageUrl: string;
  imageType: CardImageType;
  provider: CardImageProvider;
  attribution: string | null;
  isExactItem: boolean;
  fallbackUsed: boolean;
}

export function cardImageDisclaimer(image: Pick<ResolvedCardImage, "isExactItem">): string {
  return image.isExactItem ? "Exact item image." : "Catalog image — actual condition may vary.";
}
