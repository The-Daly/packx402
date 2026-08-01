import type { ChainPaymentAdapter } from "./types";
import { algorandPaymentAdapter } from "./algorand-adapter";
import { solanaPaymentAdapter } from "./solana-adapter";
import { evmPaymentAdapter } from "./evm-adapter";

export function getChainAdapter(chain: "algorand" | "solana" | "evm"): ChainPaymentAdapter {
  switch (chain) {
    case "algorand":
      return algorandPaymentAdapter;
    case "solana":
      return solanaPaymentAdapter;
    case "evm":
      return evmPaymentAdapter;
  }
}
