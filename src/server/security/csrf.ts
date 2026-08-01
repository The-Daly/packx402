import type { NextRequest } from "next/server";

const CSRF_COOKIE_NAME = "packx402_csrf";
const CSRF_HEADER_NAME = "x-csrf-token";

/**
 * Double-submit CSRF check for mutating API routes: the cookie is set by middleware.ts
 * and readable by client JS; a legitimate same-origin request echoes it back as a header.
 * A cross-site form/fetch cannot read the cookie to produce a matching header value.
 */
export function verifyCsrf(req: NextRequest): boolean {
  const cookieValue = req.cookies.get(CSRF_COOKIE_NAME)?.value;
  const headerValue = req.headers.get(CSRF_HEADER_NAME);
  return Boolean(cookieValue) && cookieValue === headerValue;
}
