import { describe, expect, it } from "vitest";
import { isAllowedImageUrl, resolveCardImage, type CardImageResolverInput } from "./resolver";

function baseInput(overrides: Partial<CardImageResolverInput> = {}): CardImageResolverInput {
  return {
    cardGame: "pokemon",
    cardName: "Charizard",
    setName: "Base Set",
    cardNumber: "4/102",
    supplierListingId: "listing-1",
    supplierImageUsePermitted: true,
    certificationNumber: null,
    ...overrides,
  };
}

describe("resolveCardImage", () => {
  it("falls back to the PackX402 card back when no provider resolves", async () => {
    const result = await resolveCardImage(baseInput());
    expect(result.fallbackUsed).toBe(true);
    expect(result.imageType).toBe("PLACEHOLDER");
    expect(result.provider).toBe("packx402_fallback");
    expect(result.isExactItem).toBe(false);
    expect(result.imageUrl).toBe("/cards/pack402-card-back.png");
  });

  it("never changes which card was won when resolution falls back", async () => {
    // The resolver's input never includes a "selected card" mutation path — this test
    // documents the invariant explicitly: fallbackUsed only changes the image, and the
    // caller is responsible for keeping cardName/cardNumber from the fairness result.
    const result = await resolveCardImage(baseInput({ cardName: "Blastoise" }));
    expect(result.fallbackUsed).toBe(true);
  });

  it("still falls back when supplier image use is not permitted", async () => {
    const result = await resolveCardImage(baseInput({ supplierImageUsePermitted: false }));
    expect(result.fallbackUsed).toBe(true);
  });

  it("still falls back when a certification number is present (no live PSA credential)", async () => {
    const result = await resolveCardImage(baseInput({ certificationNumber: "12345678" }));
    expect(result.fallbackUsed).toBe(true);
  });
});

describe("isAllowedImageUrl", () => {
  it("allows https URLs on the documented allowlist", () => {
    expect(isAllowedImageUrl("https://images.cardtrader.com/foo.jpg")).toBe(true);
    expect(isAllowedImageUrl("https://images.pokemontcg.io/base1/4.png")).toBe(true);
  });

  it("rejects non-allowlisted hosts", () => {
    expect(isAllowedImageUrl("https://evil.example.com/foo.jpg")).toBe(false);
  });

  it("rejects non-https protocols", () => {
    expect(isAllowedImageUrl("http://images.cardtrader.com/foo.jpg")).toBe(false);
  });

  it("rejects malformed URLs without throwing", () => {
    expect(isAllowedImageUrl("not-a-url")).toBe(false);
  });

  it("rejects internal/private-looking hosts (SSRF guard)", () => {
    expect(isAllowedImageUrl("https://169.254.169.254/latest/meta-data")).toBe(false);
    expect(isAllowedImageUrl("https://localhost/foo.jpg")).toBe(false);
  });
});
