import { describe, expect, it } from "vitest";
import { createMockCardTraderProvider } from "./mock-provider";

const shippingAddress = {
  fullName: "Ash Ketchum",
  line1: "123 Pallet Town Rd",
  city: "Pallet Town",
  postalCode: "00001",
  country: "US",
};

describe("mock CardTrader provider", () => {
  it("searches fixture inventory by card game", async () => {
    const provider = createMockCardTraderProvider();
    const results = await provider.searchEligibleListings({ cardGame: "yugioh" });
    expect(results.length).toBeGreaterThan(0);
    expect(results.every((r) => r.cardGame === "yugioh")).toBe(true);
  });

  it("completes a full add-to-cart -> purchase flow", async () => {
    const provider = createMockCardTraderProvider();
    const listings = await provider.searchEligibleListings({});
    const target = listings[0];

    await provider.addToCart(target.externalListingId, 1);
    const cart = await provider.confirmCart();
    expect(cart.itemCount).toBe(1);

    const order = await provider.purchaseListing({
      idempotencyKey: "test-key-1",
      shippingAddress,
    });
    expect(order.status).toBe("submitted");
    expect(order.totalUsdcBaseUnits).toBe(target.priceUsdcBaseUnits);

    const cartAfter = await provider.confirmCart();
    expect(cartAfter.itemCount).toBe(0);
  });

  it("is idempotent: purchasing twice with the same key returns the same order, never double-charges", async () => {
    const provider = createMockCardTraderProvider();
    const listings = await provider.searchEligibleListings({});
    await provider.addToCart(listings[0].externalListingId, 1);

    const first = await provider.purchaseListing({ idempotencyKey: "dup-key", shippingAddress });
    // A second call with the same idempotency key, even with an empty cart, must replay
    // the original order rather than throwing "cart is empty" or creating a new order.
    const second = await provider.purchaseListing({ idempotencyKey: "dup-key", shippingAddress });

    expect(second.externalOrderId).toBe(first.externalOrderId);
  });

  it("aborts addToCart when the cart already has contents (section 39 safety)", async () => {
    const provider = createMockCardTraderProvider();
    const listings = await provider.searchEligibleListings({});
    await provider.addToCart(listings[0].externalListingId, 1);

    await expect(provider.addToCart(listings[1].externalListingId, 1)).rejects.toThrow(/not empty/);
  });

  it("validateListing rejects an unknown listing id", async () => {
    const provider = createMockCardTraderProvider();
    const result = await provider.validateListing("does-not-exist");
    expect(result.valid).toBe(false);
  });

  it("healthCheck reports healthy", async () => {
    const provider = createMockCardTraderProvider();
    const health = await provider.healthCheck();
    expect(health.status).toBe("healthy");
  });
});
