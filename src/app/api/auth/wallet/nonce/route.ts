import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createWalletNonce } from "@/server/auth/auth-service";
import { serverEnv } from "@/server/env";
import { getClientContext } from "@/server/http/request-context";
import { checkRateLimit } from "@/server/security/rate-limit";

const bodySchema = z.object({
  chain: z.enum(["algorand", "solana", "evm"]),
  address: z.string().min(1),
  purpose: z.enum(["login", "wallet_link"]).default("login"),
});

export async function POST(req: NextRequest) {
  const { ipHash } = getClientContext(req);
  const rateLimit = await checkRateLimit({
    key: `wallet-nonce:${ipHash ?? "unknown"}`,
    limit: 20,
    windowSeconds: 60 * 15,
  });
  if (!rateLimit.allowed) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  const url = new URL(req.url);
  const { message, nonce } = await createWalletNonce({
    chain: parsed.data.chain,
    address: parsed.data.address,
    domain: url.host,
    uri: serverEnv.APP_URL,
    purpose: parsed.data.purpose,
  });

  return NextResponse.json({ message, nonce });
}
