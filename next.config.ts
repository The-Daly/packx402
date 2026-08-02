import type { NextConfig } from "next";

// Every host here must also be in the resolver's own domain allowlist
// (src/server/card-images/resolver.ts's ALLOWED_IMAGE_HOSTS) — that's the security
// boundary; this is just what next/image needs to be told to actually fetch/optimize.
const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.pokemontcg.io" },
      { protocol: "https", hostname: "images.ygoprodeck.com" },
      { protocol: "https", hostname: "ygoprodeck.com" },
      { protocol: "https", hostname: "images.cardtrader.com" },
      { protocol: "https", hostname: "cardtrader.com" },
      { protocol: "https", hostname: "www.psacard.com" },
    ],
  },
};

export default nextConfig;
