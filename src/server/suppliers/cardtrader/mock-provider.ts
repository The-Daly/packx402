import { sha256Hex } from "@/server/fairness/engine";
import type {
  SupplierAdapter,
  SupplierCartState,
  SupplierEligibleListing,
  SupplierHealth,
  SupplierListingQuote,
  SupplierOrder,
  SupplierTracking,
} from "../types";
import { MOCK_CARDTRADER_INVENTORY } from "./fixtures";

/**
 * In-memory mock CardTrader adapter. Deterministic, side-effect-free besides its own
 * process-local cart state, and never reaches the network. This is the default provider
 * (CARDTRADER_MODE=mock) and the one exercised by this repo's automated tests.
 */
export function createMockCardTraderProvider(): SupplierAdapter {
  let cart: SupplierCartState = { itemCount: 0, items: [] };
  const purchasedIdempotencyKeys = new Map<string, SupplierOrder>();
  const orders = new Map<string, SupplierOrder>();

  return {
    key: "cardtrader",
    mode: "mock",

    async searchEligibleListings({ cardGame, cardName, setName }) {
      return MOCK_CARDTRADER_INVENTORY.filter(
        (l) =>
          (!cardGame || l.cardGame === cardGame) &&
          (!cardName || l.cardName.toLowerCase().includes(cardName.toLowerCase())) &&
          (!setName || l.setName.toLowerCase().includes(setName.toLowerCase())),
      );
    },

    async getLiveQuote(externalListingId): Promise<SupplierListingQuote | null> {
      const listing = MOCK_CARDTRADER_INVENTORY.find(
        (l) => l.externalListingId === externalListingId,
      );
      if (!listing) return null;
      return {
        externalListingId,
        priceUsdcBaseUnits: listing.priceUsdcBaseUnits,
        quantityAvailable: listing.quantityAvailable,
        asOf: new Date(),
      };
    },

    async validateListing(externalListingId) {
      const listing: SupplierEligibleListing | undefined = MOCK_CARDTRADER_INVENTORY.find(
        (l) => l.externalListingId === externalListingId,
      );
      if (!listing) return { valid: false, reason: "listing_not_found" };
      if (listing.quantityAvailable <= 0) return { valid: false, reason: "out_of_stock" };
      return { valid: true };
    },

    async addToCart(externalListingId, quantity) {
      const listing = MOCK_CARDTRADER_INVENTORY.find(
        (l) => l.externalListingId === externalListingId,
      );
      if (!listing) throw new Error(`Unknown mock listing: ${externalListingId}`);
      if (cart.itemCount > 0) {
        throw new Error("Mock cart is not empty — abort per section 39 (unexpected cart contents)");
      }
      cart = {
        itemCount: quantity,
        items: [{ externalListingId, quantity, priceUsdcBaseUnits: listing.priceUsdcBaseUnits }],
      };
      return cart;
    },

    async confirmCart() {
      return cart;
    },

    async purchaseListing({ idempotencyKey, shippingAddress }) {
      const existing = purchasedIdempotencyKeys.get(idempotencyKey);
      if (existing) return existing; // idempotent replay — never double-purchase

      if (cart.items.length === 0) {
        throw new Error("Cannot purchase: cart is empty");
      }
      const total = cart.items.reduce((acc, i) => acc + i.priceUsdcBaseUnits * i.quantity, 0);
      const externalOrderId = `mock-order-${sha256Hex(idempotencyKey + shippingAddress.postalCode).slice(0, 16)}`;
      const order: SupplierOrder = {
        externalOrderId,
        status: "submitted",
        totalUsdcBaseUnits: total,
      };
      purchasedIdempotencyKeys.set(idempotencyKey, order);
      orders.set(externalOrderId, order);
      cart = { itemCount: 0, items: [] };
      return order;
    },

    async removeFromCart(externalListingId) {
      cart = {
        itemCount: 0,
        items: cart.items.filter((i) => i.externalListingId !== externalListingId),
      };
      return cart;
    },

    async getOrder(externalOrderId) {
      const order = orders.get(externalOrderId);
      if (!order) throw new Error(`Unknown mock order: ${externalOrderId}`);
      return order;
    },

    async getTracking(externalOrderId): Promise<SupplierTracking | null> {
      if (!orders.has(externalOrderId)) return null;
      return {
        carrier: "MockShip",
        trackingNumber: `MOCK${externalOrderId.slice(-8).toUpperCase()}`,
        trackingUrl: `https://example.com/track/${externalOrderId}`,
        estimatedDeliveryStart: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
        estimatedDeliveryEnd: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
      };
    },

    async requestCancellation(externalOrderId) {
      const order = orders.get(externalOrderId);
      if (!order) return { cancelled: false, reason: "order_not_found" };
      order.status = "cancelled";
      return { cancelled: true };
    },

    async healthCheck(): Promise<SupplierHealth> {
      return { status: "healthy", checkedAt: new Date(), detail: "mock provider always healthy" };
    },
  };
}
