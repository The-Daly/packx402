"use client";

import { useEffect, useState } from "react";
import { COUNTRIES, US_STATES } from "@/shared/countries";

const CSRF_COOKIE_NAME = "packx402_csrf";

function readCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

function csrfHeaders(): HeadersInit {
  const token = readCookie(CSRF_COOKIE_NAME);
  return token ? { "x-csrf-token": token } : {};
}

interface ShippingAddress {
  id: string;
  fullName: string;
  line1: string;
  line2: string | null;
  city: string;
  stateOrProvince: string | null;
  postalCode: string;
  country: string;
  isDefault: boolean;
}

const EMPTY_FORM = {
  fullName: "",
  line1: "",
  line2: "",
  city: "",
  stateOrProvince: "",
  postalCode: "",
  country: "US",
};

/**
 * Add/list/delete/set-default shipping addresses — the piece the supplier-purchase
 * worker (src/server/suppliers/purchase-worker.ts) needs a row in before it can
 * complete a real purchase. Every field round-trips through the encrypted
 * shipping_addresses table via /api/shipping-addresses (see that route for the
 * encrypt-at-rest details).
 */
export function ShippingAddressManager() {
  const [addresses, setAddresses] = useState<ShippingAddress[] | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function loadAddresses() {
    return fetch("/api/shipping-addresses")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setAddresses(data && Array.isArray(data.addresses) ? data.addresses : []))
      .catch(() => setAddresses([]));
  }

  useEffect(() => {
    let cancelled = false;
    fetch("/api/shipping-addresses")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled) setAddresses(data && Array.isArray(data.addresses) ? data.addresses : []);
      })
      .catch(() => {
        if (!cancelled) setAddresses([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/shipping-addresses", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...csrfHeaders() },
        body: JSON.stringify({
          ...form,
          line2: form.line2 || undefined,
          stateOrProvince: form.stateOrProvince || undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error === "invalid_request" ? "Check the fields and try again." : "Could not save this address.");
        return;
      }
      setForm(EMPTY_FORM);
      setShowForm(false);
      await loadAddresses();
    } catch {
      setError("Network error — please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    await fetch(`/api/shipping-addresses/${id}`, { method: "DELETE", headers: csrfHeaders() });
    await loadAddresses();
  }

  async function handleSetDefault(id: string) {
    await fetch(`/api/shipping-addresses/${id}/default`, { method: "POST", headers: csrfHeaders() });
    await loadAddresses();
  }

  return (
    <div className="space-y-6">
      {addresses === null ? (
        <p className="text-muted text-sm">Loading…</p>
      ) : addresses.length === 0 ? (
        <p className="border-border-subtle bg-surface text-muted rounded-lg border p-4 text-sm">
          No shipping address on file yet — add one below so PackX402 knows where to ship
          any card you pull.
        </p>
      ) : (
        <ul className="space-y-3">
          {addresses.map((addr) => (
            <li
              key={addr.id}
              className="border-border-subtle bg-surface flex items-start justify-between gap-4 rounded-lg border p-4"
            >
              <div className="text-sm">
                <p className="font-semibold">
                  {addr.fullName}
                  {addr.isDefault && (
                    <span className="text-accent ml-2 text-xs font-semibold">Default</span>
                  )}
                </p>
                <p className="text-muted">
                  {addr.line1}
                  {addr.line2 ? `, ${addr.line2}` : ""}
                </p>
                <p className="text-muted">
                  {addr.city}
                  {addr.stateOrProvince ? `, ${addr.stateOrProvince}` : ""} {addr.postalCode}
                </p>
                <p className="text-muted">{addr.country}</p>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-2 text-xs">
                {!addr.isDefault && (
                  <button
                    type="button"
                    onClick={() => void handleSetDefault(addr.id)}
                    className="text-accent hover:text-accent-strong font-semibold"
                  >
                    Set as default
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => void handleDelete(addr.id)}
                  className="text-muted hover:text-red-400"
                >
                  Remove
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {showForm ? (
        <form onSubmit={handleAdd} className="border-border-subtle space-y-4 rounded-lg border p-4">
          <div>
            <label htmlFor="fullName" className="mb-1 block text-sm font-medium">
              Full name
            </label>
            <input
              id="fullName"
              required
              value={form.fullName}
              onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))}
              className="border-border-subtle bg-background w-full rounded-md border px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label htmlFor="line1" className="mb-1 block text-sm font-medium">
              Address line 1
            </label>
            <input
              id="line1"
              required
              value={form.line1}
              onChange={(e) => setForm((f) => ({ ...f, line1: e.target.value }))}
              className="border-border-subtle bg-background w-full rounded-md border px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label htmlFor="line2" className="mb-1 block text-sm font-medium">
              Address line 2 (optional)
            </label>
            <input
              id="line2"
              value={form.line2}
              onChange={(e) => setForm((f) => ({ ...f, line2: e.target.value }))}
              className="border-border-subtle bg-background w-full rounded-md border px-3 py-2 text-sm"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="city" className="mb-1 block text-sm font-medium">
                City
              </label>
              <input
                id="city"
                required
                value={form.city}
                onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
                className="border-border-subtle bg-background w-full rounded-md border px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label htmlFor="postalCode" className="mb-1 block text-sm font-medium">
                Postal code
              </label>
              <input
                id="postalCode"
                required
                value={form.postalCode}
                onChange={(e) => setForm((f) => ({ ...f, postalCode: e.target.value }))}
                className="border-border-subtle bg-background w-full rounded-md border px-3 py-2 text-sm"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="country" className="mb-1 block text-sm font-medium">
                Country
              </label>
              <select
                id="country"
                value={form.country}
                onChange={(e) => setForm((f) => ({ ...f, country: e.target.value, stateOrProvince: "" }))}
                className="border-border-subtle bg-background w-full rounded-md border px-3 py-2 text-sm"
              >
                {COUNTRIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            {form.country === "US" && (
              <div>
                <label htmlFor="state" className="mb-1 block text-sm font-medium">
                  State
                </label>
                <select
                  id="state"
                  value={form.stateOrProvince}
                  onChange={(e) => setForm((f) => ({ ...f, stateOrProvince: e.target.value }))}
                  className="border-border-subtle bg-background w-full rounded-md border px-3 py-2 text-sm"
                >
                  <option value="">Select a state</option>
                  {US_STATES.map((s) => (
                    <option key={s.code} value={s.code}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={submitting}
              className="bg-accent text-accent-foreground hover:bg-accent-strong rounded-md px-4 py-2 text-sm font-semibold disabled:opacity-50"
            >
              {submitting ? "Saving…" : "Save address"}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="border-border-subtle rounded-md border px-4 py-2 text-sm"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <button
          type="button"
          onClick={() => setShowForm(true)}
          className="border-border-subtle hover:border-accent/50 w-full rounded-md border px-4 py-2 text-sm font-semibold"
        >
          + Add a shipping address
        </button>
      )}
    </div>
  );
}
