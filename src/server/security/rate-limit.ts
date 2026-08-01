import Redis from "ioredis";
import { serverEnv } from "@/server/env";

let client: Redis | null = null;
function getRedis(): Redis {
  client ??= new Redis(serverEnv.REDIS_URL, { maxRetriesPerRequest: 2, lazyConnect: false });
  return client;
}

/**
 * Fixed-window rate limiter backed by Redis. Fails OPEN (allows the request) if Redis is
 * unreachable, logging the failure — an outage in the rate limiter should degrade
 * gracefully rather than take down the whole API surface. Sensitive endpoints (payment
 * settlement, admin actions) should pair this with idempotency keys and DB-level
 * constraints as the actual safety net, not rely on rate limiting alone.
 */
export async function checkRateLimit(params: {
  key: string;
  limit: number;
  windowSeconds: number;
}): Promise<{ allowed: boolean; remaining: number }> {
  try {
    const redis = getRedis();
    const redisKey = `ratelimit:${params.key}:${Math.floor(Date.now() / 1000 / params.windowSeconds)}`;
    const count = await redis.incr(redisKey);
    if (count === 1) {
      await redis.expire(redisKey, params.windowSeconds);
    }
    return { allowed: count <= params.limit, remaining: Math.max(0, params.limit - count) };
  } catch (err) {
    console.error("Rate limit check failed, failing open:", err);
    return { allowed: true, remaining: params.limit };
  }
}
