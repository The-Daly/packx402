"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";

interface VerifyResponse {
  ripId: string;
  valid: boolean;
  failures: string[];
  proof: Record<string, string>;
}

export function VerifierForm() {
  const searchParams = useSearchParams();
  const [ripId, setRipId] = useState(() => searchParams.get("ripId") ?? "");
  const [result, setResult] = useState<VerifyResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const autoVerifiedRef = useRef(false);

  async function verify(id: string) {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/fairness/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ripId: id.trim() }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error ?? "verification_failed");
        return;
      }
      setResult(await res.json());
    } catch {
      setError("network_error");
    } finally {
      setLoading(false);
    }
  }

  // Prefill and auto-verify when arriving via a "Verify" link (e.g. from /collection)
  // with ?ripId=... already known — saves a manual paste-and-click round trip.
  useEffect(() => {
    const fromQuery = searchParams.get("ripId");
    if (fromQuery && !autoVerifiedRef.current) {
      autoVerifiedRef.current = true;
      void verify(fromQuery);
    }
  }, [searchParams]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await verify(ripId);
  }

  return (
    <div className="border-border-subtle bg-surface rounded-lg border p-6">
      <form onSubmit={handleSubmit} className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex-1">
          <label htmlFor="ripId" className="text-muted mb-1 block text-sm">
            Rip ID
          </label>
          <input
            id="ripId"
            name="ripId"
            value={ripId}
            onChange={(e) => setRipId(e.target.value)}
            placeholder="e.g. 3fa85f64-5717-4562-b3fc-2c963f66afa6"
            className="border-border-subtle bg-surface-raised focus:border-accent w-full rounded-md border px-3 py-2 text-sm outline-none"
          />
        </div>
        <button
          type="submit"
          disabled={loading || ripId.trim().length === 0}
          className="bg-accent text-accent-foreground hover:bg-accent-strong rounded-md px-5 py-2 text-sm font-semibold disabled:opacity-50"
        >
          {loading ? "Verifying…" : "Verify"}
        </button>
      </form>

      {error && (
        <p role="alert" className="text-danger mt-4 text-sm">
          Could not verify: {error}
        </p>
      )}

      {result && (
        <div className="mt-6" aria-live="polite">
          <p className={`mb-3 font-semibold ${result.valid ? "text-success" : "text-danger"}`}>
            {result.valid ? "Selection verified ✓" : "Verification failed"}
          </p>
          {result.failures.length > 0 && (
            <ul className="text-danger mb-3 list-inside list-disc text-sm">
              {result.failures.map((f) => (
                <li key={f}>{f}</li>
              ))}
            </ul>
          )}
          <dl className="grid grid-cols-1 gap-x-6 gap-y-2 text-xs sm:grid-cols-2">
            {Object.entries(result.proof).map(([key, value]) => (
              <div key={key} className="overflow-hidden">
                <dt className="text-muted">{key}</dt>
                <dd className="font-mono break-all">{value}</dd>
              </div>
            ))}
          </dl>
          <button
            type="button"
            onClick={() => navigator.clipboard.writeText(JSON.stringify(result, null, 2))}
            className="border-border-subtle hover:border-accent/50 mt-4 rounded-md border px-4 py-2 text-xs"
          >
            Copy proof bundle
          </button>
        </div>
      )}
    </div>
  );
}
