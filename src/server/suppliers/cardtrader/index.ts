import { serverEnv } from "@/server/env";
import type { SupplierAdapter } from "../types";
import { createMockCardTraderProvider } from "./mock-provider";
import { createLiveCardTraderProvider } from "./live-provider";

let cached: SupplierAdapter | null = null;

export function getCardTraderProvider(): SupplierAdapter {
  if (cached) return cached;
  cached =
    serverEnv.CARDTRADER_MODE === "live" && serverEnv.CARDTRADER_API_TOKEN
      ? createLiveCardTraderProvider()
      : createMockCardTraderProvider();
  return cached;
}

export * from "../types";
