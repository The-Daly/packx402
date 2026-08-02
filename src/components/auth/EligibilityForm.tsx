"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const CSRF_COOKIE_NAME = "packx402_csrf";

function readCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

// A compact but real ISO 3166-1 alpha-2 list — not exhaustive, but covers the markets
// this beta actually ships to plus enough others that "my country isn't listed" is rare.
// The server (evaluateEligibility) is the actual authority on blocked countries either way.
const COUNTRIES: Array<{ code: string; name: string }> = [
  { code: "US", name: "United States" },
  { code: "CA", name: "Canada" },
  { code: "GB", name: "United Kingdom" },
  { code: "AU", name: "Australia" },
  { code: "NZ", name: "New Zealand" },
  { code: "IE", name: "Ireland" },
  { code: "DE", name: "Germany" },
  { code: "FR", name: "France" },
  { code: "ES", name: "Spain" },
  { code: "IT", name: "Italy" },
  { code: "NL", name: "Netherlands" },
  { code: "BE", name: "Belgium" },
  { code: "SE", name: "Sweden" },
  { code: "NO", name: "Norway" },
  { code: "DK", name: "Denmark" },
  { code: "FI", name: "Finland" },
  { code: "JP", name: "Japan" },
  { code: "SG", name: "Singapore" },
  { code: "MX", name: "Mexico" },
  { code: "BR", name: "Brazil" },
];

const US_STATES: Array<{ code: string; name: string }> = [
  { code: "AL", name: "Alabama" }, { code: "AK", name: "Alaska" }, { code: "AZ", name: "Arizona" },
  { code: "AR", name: "Arkansas" }, { code: "CA", name: "California" }, { code: "CO", name: "Colorado" },
  { code: "CT", name: "Connecticut" }, { code: "DE", name: "Delaware" }, { code: "FL", name: "Florida" },
  { code: "GA", name: "Georgia" }, { code: "HI", name: "Hawaii" }, { code: "ID", name: "Idaho" },
  { code: "IL", name: "Illinois" }, { code: "IN", name: "Indiana" }, { code: "IA", name: "Iowa" },
  { code: "KS", name: "Kansas" }, { code: "KY", name: "Kentucky" }, { code: "LA", name: "Louisiana" },
  { code: "ME", name: "Maine" }, { code: "MD", name: "Maryland" }, { code: "MA", name: "Massachusetts" },
  { code: "MI", name: "Michigan" }, { code: "MN", name: "Minnesota" }, { code: "MS", name: "Mississippi" },
  { code: "MO", name: "Missouri" }, { code: "MT", name: "Montana" }, { code: "NE", name: "Nebraska" },
  { code: "NV", name: "Nevada" }, { code: "NH", name: "New Hampshire" }, { code: "NJ", name: "New Jersey" },
  { code: "NM", name: "New Mexico" }, { code: "NY", name: "New York" }, { code: "NC", name: "North Carolina" },
  { code: "ND", name: "North Dakota" }, { code: "OH", name: "Ohio" }, { code: "OK", name: "Oklahoma" },
  { code: "OR", name: "Oregon" }, { code: "PA", name: "Pennsylvania" }, { code: "RI", name: "Rhode Island" },
  { code: "SC", name: "South Carolina" }, { code: "SD", name: "South Dakota" }, { code: "TN", name: "Tennessee" },
  { code: "TX", name: "Texas" }, { code: "UT", name: "Utah" }, { code: "VT", name: "Vermont" },
  { code: "VA", name: "Virginia" }, { code: "WA", name: "Washington" }, { code: "WV", name: "West Virginia" },
  { code: "WI", name: "Wisconsin" }, { code: "WY", name: "Wyoming" }, { code: "DC", name: "District of Columbia" },
];

const DENIAL_REASON_COPY: Record<string, string> = {
  under_18_by_dob: "You must be 18 or older to use PackX402.",
  age_not_acknowledged: "You must confirm you're 18 or older to continue.",
  location_blocked_country: "PackX402 isn't available in your country yet.",
  location_blocked_state: "PackX402 isn't available in your state yet.",
};

export interface EligibilityFormProps {
  /** Where to send the user after eligibility passes. */
  nextUrl?: string;
}

/**
 * Collects the DOB/country/18+ acknowledgment that neither Google sign-in nor a wallet
 * signature captures on their own (see submitOAuthEligibility in auth-service.ts). This is
 * a UX convenience only — the real gate is server-side in createPackOffer(), which
 * rejects any offer for a user with no passing eligibility record regardless of what this
 * form does or doesn't submit.
 */
export function EligibilityForm({ nextUrl = "/packs" }: EligibilityFormProps) {
  const router = useRouter();
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [ageAcknowledged, setAgeAcknowledged] = useState(false);
  const [country, setCountry] = useState("US");
  const [stateOrProvince, setStateOrProvince] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrors([]);
    setSubmitting(true);
    try {
      const csrfToken = readCookie(CSRF_COOKIE_NAME);
      const res = await fetch("/api/auth/oauth/complete-eligibility", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(csrfToken ? { "x-csrf-token": csrfToken } : {}),
        },
        body: JSON.stringify({
          dateOfBirth,
          ageAcknowledged18Plus: ageAcknowledged,
          country,
          stateOrProvince: country === "US" && stateOrProvince ? stateOrProvince : undefined,
        }),
      });

      if (res.status === 401) {
        setErrors(["Your session expired — sign in again and retry."]);
        return;
      }

      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data.eligible) {
        const reasons: string[] = Array.isArray(data.reasons) ? data.reasons : [];
        setErrors(
          reasons.length > 0
            ? reasons.map((r) => DENIAL_REASON_COPY[r] ?? r)
            : ["Could not verify eligibility. Please check your details and try again."],
        );
        return;
      }

      router.push(nextUrl);
      router.refresh();
    } catch {
      setErrors(["Network error — please try again."]);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mx-auto max-w-sm space-y-5">
      <div>
        <label htmlFor="dob" className="mb-1 block text-sm font-medium">
          Date of birth
        </label>
        <input
          id="dob"
          type="date"
          required
          value={dateOfBirth}
          onChange={(e) => setDateOfBirth(e.target.value)}
          className="border-border-subtle bg-surface w-full rounded-md border px-3 py-2 text-sm"
        />
      </div>

      <div>
        <label htmlFor="country" className="mb-1 block text-sm font-medium">
          Country
        </label>
        <select
          id="country"
          value={country}
          onChange={(e) => setCountry(e.target.value)}
          className="border-border-subtle bg-surface w-full rounded-md border px-3 py-2 text-sm"
        >
          {COUNTRIES.map((c) => (
            <option key={c.code} value={c.code}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      {country === "US" && (
        <div>
          <label htmlFor="state" className="mb-1 block text-sm font-medium">
            State
          </label>
          <select
            id="state"
            value={stateOrProvince}
            onChange={(e) => setStateOrProvince(e.target.value)}
            className="border-border-subtle bg-surface w-full rounded-md border px-3 py-2 text-sm"
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

      <label className="flex items-start gap-2 text-sm">
        <input
          type="checkbox"
          required
          checked={ageAcknowledged}
          onChange={(e) => setAgeAcknowledged(e.target.checked)}
          className="mt-0.5"
        />
        <span>I confirm I am 18 years of age or older.</span>
      </label>

      {errors.length > 0 && (
        <div className="rounded-md border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-400">
          {errors.map((err) => (
            <p key={err}>{err}</p>
          ))}
        </div>
      )}

      <button
        type="submit"
        disabled={submitting || !dateOfBirth || !ageAcknowledged}
        className="bg-accent text-accent-foreground hover:bg-accent-strong w-full rounded-md px-6 py-3 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50"
      >
        {submitting ? "Checking…" : "Continue"}
      </button>

      <p className="text-muted text-center text-xs">
        Required once per account before opening a pack. Packs are randomized physical
        products — see our{" "}
        <a href="/legal/responsible-purchasing" className="text-accent hover:text-accent-strong">
          Responsible Purchasing Policy
        </a>
        .
      </p>
    </form>
  );
}
