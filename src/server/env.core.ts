import { config as loadDotenv } from "dotenv";
import { z } from "zod";

/**
 * Env schema + loader with no import-time guard, so it can be used both by the
 * `server-only`-guarded app runtime (env.ts) and by standalone CLI scripts
 * (drizzle-kit config, migration/seed scripts) that run outside the Next.js
 * server-component boundary where the `server-only` guard misfires.
 *
 * dotenv.config() never overrides a variable already present in process.env, so
 * calling it here is a safe no-op under Next.js (which loads .env.local itself
 * before any app code runs) and the mechanism CLI scripts actually need.
 */
loadDotenv({ path: ".env.local" });
loadDotenv();

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  APP_URL: z.string().url().default("http://localhost:3000"),
  APP_ENV: z.enum(["development", "staging", "production"]).default("development"),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),

  SESSION_SECRET: z.string().min(32, "SESSION_SECRET must be at least 32 characters"),
  FIELD_ENCRYPTION_KEY: z
    .string()
    .regex(/^[0-9a-f]{64}$/i, "FIELD_ENCRYPTION_KEY must be a 32-byte hex string"),

  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  REDIS_URL: z.string().min(1, "REDIS_URL is required"),

  EMAIL_PROVIDER: z.enum(["console", "smtp"]).default("console"),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().int().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASSWORD: z.string().optional(),
  EMAIL_FROM: z.string().default("PackX402 <no-reply@packx402.example>"),

  S3_ENDPOINT: z.string().optional(),
  S3_REGION: z.string().default("auto"),
  S3_BUCKET: z.string().default("packx402-uploads"),
  S3_ACCESS_KEY_ID: z.string().optional(),
  S3_SECRET_ACCESS_KEY: z.string().optional(),
  S3_PUBLIC_BASE_URL: z.string().optional(),

  ALGORAND_NETWORK: z.enum(["testnet", "mainnet"]).default("testnet"),
  ALGORAND_MAINNET_ENABLED: z.coerce.boolean().default(false),
  ALGORAND_ALGOD_URL: z.string().default("https://testnet-api.algonode.cloud"),
  ALGORAND_ALGOD_TOKEN: z.string().optional(),
  ALGORAND_USDC_ASSET_ID: z.coerce.number().int().default(10458941),
  MERCHANT_ALGORAND_ADDRESS: z.string().optional(),

  X402_FACILITATOR_MODE: z.enum(["mock", "live"]).default("mock"),
  X402_FACILITATOR_URL: z.string().optional(),
  X402_FACILITATOR_API_KEY: z.string().optional(),
  X402_BAZAAR_DISCOVERY_ENABLED: z.coerce.boolean().default(true),

  SOLANA_NETWORK: z.string().default("devnet"),
  SOLANA_RPC_URL: z.string().default("https://api.devnet.solana.com"),
  SOLANA_USDC_MINT: z.string().default("4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU"),
  MERCHANT_SOLANA_ADDRESS: z.string().optional(),

  EVM_NETWORK: z.string().default("base-sepolia"),
  EVM_RPC_URL: z.string().default("https://sepolia.base.org"),
  EVM_USDC_ADDRESS: z.string().default("0x036CbD53842c5426634e7929541eC2318f3dCF7"),
  MERCHANT_EVM_ADDRESS: z.string().optional(),

  CARDTRADER_MODE: z.enum(["mock", "live"]).default("mock"),
  CARDTRADER_API_BASE_URL: z.string().default("https://api.cardtrader.com/api/v2"),
  CARDTRADER_API_TOKEN: z.string().optional(),
  CARDTRADER_ACCOUNT_ID: z.string().optional(),

  FEATURE_HIGH_VALUE_PACKS_ENABLED: z.coerce.boolean().default(false),
  FEATURE_LOYALTY_ENABLED: z.coerce.boolean().default(true),
  FEATURE_LOYALTY_KILL_SWITCH: z.coerce.boolean().default(false),
  FEATURE_AFFILIATE_PROGRAM_ENABLED: z.coerce.boolean().default(true),
  FEATURE_SOCIAL_ENABLED: z.coerce.boolean().default(true),

  ADMIN_REAUTH_TTL_SECONDS: z.coerce.number().int().default(900),

  SENTRY_DSN: z.string().optional(),
});

function loadEnv() {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  - ${i.path.join(".")}: ${i.message}`)
      .join("\n");
    throw new Error(`Invalid environment configuration:\n${issues}`);
  }

  if (parsed.data.ALGORAND_NETWORK === "mainnet" && !parsed.data.ALGORAND_MAINNET_ENABLED) {
    throw new Error(
      "ALGORAND_NETWORK=mainnet requires ALGORAND_MAINNET_ENABLED=true to be set explicitly. " +
        "PackX402 never initiates MainNet payments automatically.",
    );
  }

  return parsed.data;
}

export const serverEnv = loadEnv();
export type ServerEnv = typeof serverEnv;
