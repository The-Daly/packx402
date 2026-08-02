"use client";

import { useRouter } from "next/navigation";

const CSRF_COOKIE_NAME = "packx402_csrf";

function readCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

export interface LogoutButtonProps {
  className?: string;
}

/** Double-submit CSRF pattern (see src/server/security/csrf.ts): reads the
 * client-readable CSRF cookie and echoes it back as a header. */
export function LogoutButton({ className }: LogoutButtonProps) {
  const router = useRouter();

  async function handleLogout() {
    const csrfToken = readCookie(CSRF_COOKIE_NAME);
    await fetch("/api/auth/logout", {
      method: "POST",
      headers: csrfToken ? { "x-csrf-token": csrfToken } : {},
    });
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      className={
        className ??
        "border-border-subtle text-foreground hover:border-accent/50 rounded-md border px-3 py-1.5 text-sm"
      }
    >
      Log out
    </button>
  );
}
