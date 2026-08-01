/**
 * Provider-neutral supplier interface (spec section 37). CardTraderProvider is the first
 * (and during beta, only) implementation. Any future marketplace integration must
 * implement this same interface rather than being special-cased into calling code.
 */

export interface SupplierEligibleListing {
  externalListingId: string;
  externalSellerId: string;
  cardGame: "pokemon" | "yugioh" | "other";
  cardName: string;
  setName: string;
  cardNumber: string;
  language: string;
  finish: string;
  condition: string;
  gradeLabel?: string;
  quantityAvailable: number;
  priceUsdcBaseUnits: number;
  shipsToCustomer: boolean;
  imageUsePermitted: boolean;
  sellerReliabilityScore?: number;
  lastRefreshedAt: Date;
}

export interface SupplierListingQuote {
  externalListingId: string;
  priceUsdcBaseUnits: number;
  quantityAvailable: number;
  asOf: Date;
}

export interface SupplierCartState {
  itemCount: number;
  items: { externalListingId: string; quantity: number; priceUsdcBaseUnits: number }[];
}

export interface SupplierOrder {
  externalOrderId: string;
  status: "submitted" | "confirmed" | "preparing_shipment" | "shipped" | "delivered" | "cancelled";
  totalUsdcBaseUnits: number;
}

export interface SupplierTracking {
  carrier?: string;
  trackingNumber?: string;
  trackingUrl?: string;
  estimatedDeliveryStart?: Date;
  estimatedDeliveryEnd?: Date;
  deliveredAt?: Date;
}

export interface SupplierHealth {
  status: "healthy" | "degraded" | "down";
  checkedAt: Date;
  detail?: string;
}

export interface SupplierShippingAddress {
  fullName: string;
  line1: string;
  line2?: string;
  city: string;
  stateOrProvince?: string;
  postalCode: string;
  country: string;
}

export interface SupplierAdapter {
  key: string;
  mode: "mock" | "live";

  searchEligibleListings(params: {
    cardGame?: string;
    cardName?: string;
    setName?: string;
  }): Promise<SupplierEligibleListing[]>;

  getLiveQuote(externalListingId: string): Promise<SupplierListingQuote | null>;

  validateListing(externalListingId: string): Promise<{ valid: boolean; reason?: string }>;

  addToCart(externalListingId: string, quantity: number): Promise<SupplierCartState>;

  confirmCart(): Promise<SupplierCartState>;

  purchaseListing(params: {
    idempotencyKey: string;
    shippingAddress: SupplierShippingAddress;
  }): Promise<SupplierOrder>;

  removeFromCart(externalListingId: string): Promise<SupplierCartState>;

  getOrder(externalOrderId: string): Promise<SupplierOrder>;

  getTracking(externalOrderId: string): Promise<SupplierTracking | null>;

  requestCancellation(externalOrderId: string): Promise<{ cancelled: boolean; reason?: string }>;

  healthCheck(): Promise<SupplierHealth>;
}
