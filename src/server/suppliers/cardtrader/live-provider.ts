import { serverEnv } from "@/server/env";
import type {
  SupplierAdapter,
  SupplierCartState,
  SupplierHealth,
  SupplierListingQuote,
  SupplierOrder,
  SupplierTracking,
} from "../types";

/**
 * Live CardTrader adapter (CARDTRADER_MODE=live). Talks to CardTrader's documented v2 API
 * using direct seller fulfillment (`via_cardtrader_zero=false` per spec section 37):
 *   GET  /marketplace/products
 *   GET  /cart
 *   POST /cart/add
 *   POST /cart/remove
 *   POST /cart/purchase
 *   + official order/tracking endpoints
 *
 * IMPORTANT: this repository has not been built or integration-tested against a real
 * CardTrader account (no CARDTRADER_API_TOKEN was available in this environment). The
 * request/response shapes below follow CardTrader's published v2 API documentation as
 * understood at implementation time, but must be verified against current CardTrader
 * docs and a sandbox/live account before this path is ever enabled in production — see
 * docs/SUPPLIER_INTEGRATION.md. Do not flip CARDTRADER_MODE=live without that
 * verification pass.
 */

function authHeaders(): HeadersInit {
  return {
    Authorization: `Bearer ${serverEnv.CARDTRADER_API_TOKEN ?? ""}`,
    "Content-Type": "application/json",
  };
}

async function ctFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${serverEnv.CARDTRADER_API_BASE_URL}${path}`, {
    ...init,
    headers: { ...authHeaders(), ...(init?.headers ?? {}) },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`CardTrader API ${path} failed: ${res.status} ${body}`);
  }
  return (await res.json()) as T;
}

async function confirmCart(): Promise<SupplierCartState> {
  const data = await ctFetch<{ items?: Array<Record<string, unknown>> }>("/cart");
  const items = (data.items ?? []).map((i) => ({
    externalListingId: String(i.blueprint_id ?? i.id ?? ""),
    quantity: Number(i.quantity ?? 0),
    priceUsdcBaseUnits: Math.round(
      Number((i.price as Record<string, unknown> | undefined)?.cents ?? 0) * 10_000,
    ),
  }));
  return { itemCount: items.reduce((acc, i) => acc + i.quantity, 0), items };
}

async function getLiveQuote(externalListingId: string): Promise<SupplierListingQuote | null> {
  try {
    const p = await ctFetch<Record<string, unknown>>(`/marketplace/products/${externalListingId}`);
    return {
      externalListingId,
      priceUsdcBaseUnits: Math.round(
        Number((p.price as Record<string, unknown> | undefined)?.cents ?? 0) * 10_000,
      ),
      quantityAvailable: Number(p.quantity ?? 0),
      asOf: new Date(),
    };
  } catch {
    return null;
  }
}

export function createLiveCardTraderProvider(): SupplierAdapter {
  return {
    key: "cardtrader",
    mode: "live",

    async searchEligibleListings({ cardGame, cardName, setName }) {
      const params = new URLSearchParams();
      if (cardName) params.set("name", cardName);
      if (setName) params.set("expansion", setName);
      if (cardGame) params.set("game", cardGame);
      params.set("via_cardtrader_zero", "false");

      const data = await ctFetch<Array<Record<string, unknown>>>(
        `/marketplace/products?${params.toString()}`,
      );

      return data.map((p) => ({
        externalListingId: String(p.id),
        externalSellerId: String((p.user as Record<string, unknown> | undefined)?.id ?? ""),
        cardGame: (cardGame as "pokemon" | "yugioh" | "other") ?? "other",
        cardName: String(p.name ?? ""),
        setName: String((p.expansion as Record<string, unknown> | undefined)?.name ?? ""),
        cardNumber: String(
          (p.properties_hash as Record<string, unknown> | undefined)?.collector_number ?? "",
        ),
        language: String(
          (p.properties_hash as Record<string, unknown> | undefined)?.language ?? "en",
        ),
        finish: String(
          (p.properties_hash as Record<string, unknown> | undefined)?.foil ? "holofoil" : "normal",
        ),
        condition: String(
          (p.properties_hash as Record<string, unknown> | undefined)?.condition ?? "unknown",
        ),
        quantityAvailable: Number(p.quantity ?? 0),
        priceUsdcBaseUnits: Math.round(
          Number((p.price as Record<string, unknown> | undefined)?.cents ?? 0) * 10_000,
        ),
        shipsToCustomer: true,
        imageUsePermitted: true,
        lastRefreshedAt: new Date(),
      }));
    },

    getLiveQuote,

    async validateListing(externalListingId) {
      const quote = await getLiveQuote(externalListingId);
      if (!quote) return { valid: false, reason: "listing_not_found" };
      if (quote.quantityAvailable <= 0) return { valid: false, reason: "out_of_stock" };
      return { valid: true };
    },

    async addToCart(externalListingId, quantity): Promise<SupplierCartState> {
      const current = await confirmCart();
      if (current.itemCount > 0) {
        throw new Error(
          "CardTrader account cart is not empty — aborting per section 39 (unexpected cart contents)",
        );
      }
      await ctFetch("/cart/add", {
        method: "POST",
        body: JSON.stringify({
          blueprint_id: externalListingId,
          quantity,
          via_cardtrader_zero: false,
        }),
      });
      return confirmCart();
    },

    confirmCart,

    async purchaseListing({ idempotencyKey, shippingAddress }): Promise<SupplierOrder> {
      const cart = await confirmCart();
      if (cart.items.length === 0) {
        throw new Error("Cannot purchase: CardTrader cart is empty");
      }
      const total = cart.items.reduce((acc, i) => acc + i.priceUsdcBaseUnits * i.quantity, 0);

      const data = await ctFetch<Record<string, unknown>>("/cart/purchase", {
        method: "POST",
        headers: { "Idempotency-Key": idempotencyKey },
        body: JSON.stringify({
          shipping_address: {
            name: shippingAddress.fullName,
            address_line_1: shippingAddress.line1,
            address_line_2: shippingAddress.line2,
            city: shippingAddress.city,
            state: shippingAddress.stateOrProvince,
            zip: shippingAddress.postalCode,
            country: shippingAddress.country,
          },
        }),
      });

      return {
        externalOrderId: String(data.id ?? data.order_id ?? ""),
        status: "submitted",
        totalUsdcBaseUnits: total,
      };
    },

    async removeFromCart(externalListingId): Promise<SupplierCartState> {
      await ctFetch("/cart/remove", {
        method: "POST",
        body: JSON.stringify({ blueprint_id: externalListingId }),
      });
      return confirmCart();
    },

    async getOrder(externalOrderId): Promise<SupplierOrder> {
      const data = await ctFetch<Record<string, unknown>>(`/orders/${externalOrderId}`);
      return {
        externalOrderId,
        status: (data.status as SupplierOrder["status"]) ?? "submitted",
        totalUsdcBaseUnits: Math.round(
          Number((data.total as Record<string, unknown> | undefined)?.cents ?? 0) * 10_000,
        ),
      };
    },

    async getTracking(externalOrderId): Promise<SupplierTracking | null> {
      try {
        const data = await ctFetch<Record<string, unknown>>(`/orders/${externalOrderId}/tracking`);
        return {
          carrier: data.carrier as string | undefined,
          trackingNumber: data.tracking_number as string | undefined,
          trackingUrl: data.tracking_url as string | undefined,
        };
      } catch {
        return null;
      }
    },

    async requestCancellation(externalOrderId) {
      try {
        await ctFetch(`/orders/${externalOrderId}/cancel`, { method: "POST" });
        return { cancelled: true };
      } catch (err) {
        return {
          cancelled: false,
          reason: err instanceof Error ? err.message : "cancellation failed",
        };
      }
    },

    async healthCheck(): Promise<SupplierHealth> {
      try {
        await ctFetch("/info");
        return { status: "healthy", checkedAt: new Date() };
      } catch (err) {
        return {
          status: "down",
          checkedAt: new Date(),
          detail: err instanceof Error ? err.message : "health check failed",
        };
      }
    },
  };
}
