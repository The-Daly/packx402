import { NextRequest, NextResponse } from "next/server";

/**
 * Global security middleware: CSP + standard secure headers on every response, plus a
 * double-submit CSRF token issued as a readable cookie for state-changing requests to
 * pair with the `X-CSRF-Token` header (checked in individual mutating route handlers).
 */

const CSRF_COOKIE_NAME = "packx402_csrf";
const isDev = process.env.NODE_ENV !== "production";

function buildCsp(nonce: string): string {
  return [
    "default-src 'self'",
    // Next.js dev mode (React Refresh / HMR debugging) requires 'unsafe-eval' — never
    // relaxed in production, where only the per-request nonce is trusted.
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https:",
    "font-src 'self' data:",
    `connect-src 'self' https://testnet-api.algonode.cloud https://api.devnet.solana.com https://sepolia.base.org${isDev ? " ws:" : ""}`,
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
    ...(isDev ? [] : ["upgrade-insecure-requests"]),
  ].join("; ");
}

export function proxy(req: NextRequest) {
  const nonce = crypto.randomUUID().replaceAll("-", "");
  const res = NextResponse.next({ request: { headers: new Headers(req.headers) } });

  res.headers.set("Content-Security-Policy", buildCsp(nonce));
  if (!isDev) {
    res.headers.set("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload");
  }
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("X-Frame-Options", "DENY");
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  res.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=(self)");

  if (!req.cookies.get(CSRF_COOKIE_NAME)) {
    res.cookies.set(CSRF_COOKIE_NAME, crypto.randomUUID(), {
      httpOnly: false, // must be readable by client JS to echo back as a header (double-submit pattern)
      // `secure` cookies are dropped by browsers on plain-HTTP origins other than
      // localhost's special case — never reliable in local dev, so only require it
      // in production where the app is always served over HTTPS.
      secure: !isDev,
      sameSite: "lax",
      path: "/",
    });
  }

  return res;
}

export const config = {
  matcher: [
    // Skip static assets and image optimization files.
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
