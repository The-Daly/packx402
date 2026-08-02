"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const CSRF_COOKIE_NAME = "packx402_csrf";

function readCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

interface SessionRow {
  id: string;
  authMethod: string;
  userAgent: string | null;
  createdAt: string;
  lastSeenAt: string;
  expiresAt: string;
  isCurrent: boolean;
}

/** Lists the signed-in user's own active sessions (never another user's) and lets them
 * sign out everywhere at once — a real security control, not decoration: if a wallet
 * signature or Google token is ever compromised, this is how a user cuts it off. */
export function SessionsManager() {
  const router = useRouter();
  const [sessions, setSessions] = useState<SessionRow[] | null>(null);
  const [revoking, setRevoking] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/auth/sessions")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled) setSessions(data && Array.isArray(data.sessions) ? data.sessions : []);
      })
      .catch(() => {
        if (!cancelled) setSessions([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleRevokeAll() {
    setRevoking(true);
    try {
      const csrfToken = readCookie(CSRF_COOKIE_NAME);
      await fetch("/api/auth/sessions/revoke-all", {
        method: "POST",
        headers: csrfToken ? { "x-csrf-token": csrfToken } : {},
      });
      router.push("/");
      router.refresh();
    } finally {
      setRevoking(false);
    }
  }

  if (sessions === null) {
    return <p className="text-muted text-sm">Loading…</p>;
  }

  return (
    <div className="space-y-4">
      <ul className="space-y-2">
        {sessions.map((s) => (
          <li
            key={s.id}
            className="border-border-subtle bg-surface flex items-center justify-between rounded-lg border p-3 text-sm"
          >
            <div>
              <p className="font-medium">
                {s.authMethod === "google" ? "Google sign-in" : "Wallet sign-in"}
                {s.isCurrent && (
                  <span className="text-accent ml-2 text-xs font-semibold">This device</span>
                )}
              </p>
              <p className="text-muted text-xs">
                Last active {new Date(s.lastSeenAt).toLocaleString()}
              </p>
            </div>
          </li>
        ))}
      </ul>
      <button
        type="button"
        onClick={() => void handleRevokeAll()}
        disabled={revoking}
        className="border-border-subtle hover:border-accent/50 w-full rounded-md border px-4 py-2 text-sm font-semibold disabled:opacity-50"
      >
        {revoking ? "Signing out…" : "Sign out everywhere"}
      </button>
    </div>
  );
}
