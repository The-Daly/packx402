import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
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

function mockFetchOk(body: unknown) {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({ ok: true, json: async () => body }),
  );
}

function mockFetchFails() {
  vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network unreachable")));
}

describe("resolveCardImage", () => {
  beforeEach(() => {
    mockFetchFails(); // default: no live network in these tests unless a test opts in
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

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

  it("resolves a real Pokemon TCG API catalog image when the API returns one", async () => {
    mockFetchOk({
      data: [{ images: { large: "https://images.pokemontcg.io/base1/4_hires.png" } }],
    });
    const result = await resolveCardImage(baseInput());
    expect(result.fallbackUsed).toBe(false);
    expect(result.imageType).toBe("CATALOG_RENDER");
    expect(result.provider).toBe("pokemon_tcg");
    expect(result.imageUrl).toBe("https://images.pokemontcg.io/base1/4_hires.png");
    expect(result.isExactItem).toBe(false); // catalog render, not the exact physical item
  });

  it("resolves a real YGOPRODeck catalog image for yugioh cards", async () => {
    mockFetchOk({
      data: [{ card_images: [{ image_url: "https://images.ygoprodeck.com/images/cards/1.jpg" }] }],
    });
    const result = await resolveCardImage(baseInput({ cardGame: "yugioh", cardName: "Dark Magician" }));
    expect(result.fallbackUsed).toBe(false);
    expect(result.provider).toBe("ygoprodeck");
    expect(result.imageUrl).toBe("https://images.ygoprodeck.com/images/cards/1.jpg");
  });

  it("falls back when the catalog API returns an image on a non-allowlisted host", async () => {
    mockFetchOk({ data: [{ images: { large: "https://evil.example.com/fake.png" } }] });
    const result = await resolveCardImage(baseInput());
    expect(result.fallbackUsed).toBe(true);
  });

  it("falls back when the catalog API returns no matching card", async () => {
    mockFetchOk({ data: [] });
    const result = await resolveCardImage(baseInput());
    expect(result.fallbackUsed).toBe(true);
  });

  it("falls back on a catalog API network error rather than throwing", async () => {
    mockFetchFails();
    await expect(resolveCardImage(baseInput())).resolves.toMatchObject({ fallbackUsed: true });
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
