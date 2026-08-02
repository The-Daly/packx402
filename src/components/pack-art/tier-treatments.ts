import type { PackTierKey } from "@/server/config/pack-tiers";

/**
 * Tier-specific CSS materials/colors for the PackArt fallback face. These are branded
 * DEVELOPMENT PLACEHOLDERS — not final Higgsfield-generated artwork. See
 * docs/ASSET_MANIFEST.md for the real asset filenames/dimensions this is standing in for.
 */
export interface TierTreatment {
  label: string; // human-readable material name shown nowhere by default, useful for debugging/tests
  accentColor: string; // primary foil/edge color
  secondaryColor: string; // secondary gradient stop
  textColor: string; // legible text color against this material
  glow: string; // box-shadow color used for the ambient glow
  foilGradient: string; // CSS gradient for the main face
}

export const TIER_TREATMENTS: Record<PackTierKey, TierTreatment> = {
  spark: {
    label: "Satin-black foil, electric-cyan edge pulse",
    accentColor: "#3FE1FF",
    secondaryColor: "#0B2A33",
    textColor: "#EAFDFF",
    glow: "rgba(63,225,255,0.35)",
    foilGradient: "linear-gradient(155deg, #0c1416 0%, #10262b 45%, #123640 75%, #0c1416 100%)",
  },
  starter: {
    label: "Brushed copper, warm amber highlights",
    accentColor: "#C97A44",
    secondaryColor: "#3A2416",
    textColor: "#FBEEE3",
    glow: "rgba(201,122,68,0.32)",
    foilGradient: "linear-gradient(155deg, #17110c 0%, #2c1c10 45%, #3a2414 75%, #17110c 100%)",
  },
  scout: {
    label: "Deep forest-teal, silver directional geometry",
    accentColor: "#3FA88C",
    secondaryColor: "#12312A",
    textColor: "#E7F7F1",
    glow: "rgba(63,168,140,0.32)",
    foilGradient: "linear-gradient(155deg, #0c1613 0%, #123a2f 45%, #164438 75%, #0c1613 100%)",
  },
  bronze: {
    label: "Aged bronze, matte-black center",
    accentColor: "#B08050",
    secondaryColor: "#2E2013",
    textColor: "#F4E9DA",
    glow: "rgba(176,128,80,0.3)",
    foilGradient: "linear-gradient(155deg, #150f0a 0%, #2a1d10 45%, #362713 75%, #150f0a 100%)",
  },
  silver: {
    label: "Satin silver, cool-white highlights",
    accentColor: "#C7CDD6",
    secondaryColor: "#2A2E36",
    textColor: "#F7F9FC",
    glow: "rgba(199,205,214,0.28)",
    foilGradient: "linear-gradient(155deg, #101215 0%, #1e2229 45%, #292f38 75%, #101215 100%)",
  },
  gold: {
    label: "Champagne gold, black enamel center",
    accentColor: "#D4AF6A",
    secondaryColor: "#332711",
    textColor: "#FBF1DE",
    glow: "rgba(212,175,106,0.34)",
    foilGradient: "linear-gradient(155deg, #120e07 0%, #2a2010 45%, #3a2c14 75%, #120e07 100%)",
  },
  prism: {
    label: "Satin-black base, controlled spectral refraction",
    accentColor: "#B98CE6",
    secondaryColor: "#241537",
    textColor: "#F5EEFC",
    glow: "rgba(185,140,230,0.32)",
    foilGradient:
      "linear-gradient(155deg, #0d0a12 0%, #1c1230 35%, #241a3d 55%, #12202e 75%, #0d0a12 100%)",
  },
  platinum: {
    label: "Ice-white platinum, cool-blue edge lighting",
    accentColor: "#CFE7F5",
    secondaryColor: "#1B2A33",
    textColor: "#F5FBFD",
    glow: "rgba(207,231,245,0.3)",
    foilGradient: "linear-gradient(155deg, #0c1013 0%, #182229 45%, #21323d 75%, #0c1013 100%)",
  },
  obsidian: {
    label: "Volcanic black glass, champagne-gold geometry, emerald side lighting",
    accentColor: "#D4AF6A",
    secondaryColor: "#0F2A22",
    textColor: "#F7EFDD",
    glow: "rgba(212,175,106,0.3)",
    foilGradient: "linear-gradient(155deg, #07080a 0%, #10171a 40%, #0f2621 70%, #07080a 100%)",
  },
  mythic: {
    label: "Cosmic violet-black foil, antique-gold edge engraving",
    accentColor: "#9B6FD6",
    secondaryColor: "#1E1233",
    textColor: "#F1EAFB",
    glow: "rgba(155,111,214,0.34)",
    foilGradient: "linear-gradient(155deg, #0b0813 0%, #1b1130 45%, #241a3d 75%, #0b0813 100%)",
  },
  crown: {
    label: "Royal black enamel, ruby accent, champagne-gold border",
    accentColor: "#D4AF6A",
    secondaryColor: "#3A0E16",
    textColor: "#FBEFE0",
    glow: "rgba(178,42,58,0.3)",
    foilGradient: "linear-gradient(155deg, #0c0708 0%, #220d12 40%, #2c1712 70%, #0c0708 100%)",
  },
  vault: {
    label: "Dark emerald metallic foil, gold vault-line geometry",
    accentColor: "#3FA88C",
    secondaryColor: "#0F2A22",
    textColor: "#EAF7F1",
    glow: "rgba(63,168,140,0.3)",
    foilGradient: "linear-gradient(155deg, #060c0a 0%, #0d211b 45%, #123a2f 75%, #060c0a 100%)",
  },
  grail: {
    label: "Refined ivory enamel, antique-gold edges",
    accentColor: "#E8D9B5",
    secondaryColor: "#2E2717",
    textColor: "#FBF6EA",
    glow: "rgba(232,217,181,0.3)",
    foilGradient: "linear-gradient(155deg, #14110c 0%, #241f14 45%, #332b1a 75%, #14110c 100%)",
  },
  genesis: {
    label: "Black-diamond material, aurora edge reflections, champagne-gold crest",
    accentColor: "#D4AF6A",
    secondaryColor: "#132A2E",
    textColor: "#FBF1DE",
    glow: "rgba(212,175,106,0.36)",
    foilGradient:
      "linear-gradient(155deg, #05070a 0%, #0d1520 30%, #12212e 55%, #0f2822 80%, #05070a 100%)",
  },
};

export function getTierTreatment(tierKey: PackTierKey): TierTreatment {
  return TIER_TREATMENTS[tierKey];
}
