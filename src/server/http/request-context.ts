import { createHash } from "node:crypto";
import type { NextRequest } from "next/server";

/**
 * Never store a raw IP address (spec section 6/47) — only a salted-by-obscurity hash for
 * abuse/security-event correlation. Good enough to detect "same network, repeated
 * attempts" without retaining a directly identifying value.
 */
export function hashIp(ip: string): string {
  return createHash("sha256").update(ip).digest("hex").slice(0, 32);
}

export function getClientContext(req: NextRequest): { ipHash?: string; userAgent?: string } {
  const forwardedFor = req.headers.get("x-forwarded-for");
  const ip = forwardedFor?.split(",")[0]?.trim();
  return {
    ipHash: ip ? hashIp(ip) : undefined,
    userAgent: req.headers.get("user-agent") ?? undefined,
  };
}
