import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton";
import { LogoutButton } from "@/components/auth/LogoutButton";
import { AuthAwareHeaderActions, AuthAwareNavLink } from "@/components/auth/AuthAwareHeaderActions";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "PackX402 — Open. Verify. Collect.",
  description:
    "A provably fair, supplier-backed trading-card pack platform powered by Algorand x402.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="bg-background text-foreground flex min-h-full flex-col">
        <a href="#main-content" className="skip-link">
          Skip to main content
        </a>
        <SiteHeader />
        <main id="main-content" className="flex-1">
          {children}
        </main>
        <SiteFooter />
      </body>
    </html>
  );
}

function SiteHeader() {
  return (
    <header className="border-border-subtle bg-surface/80 border-b backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center gap-2 text-lg font-semibold tracking-wide">
          <span
            aria-hidden
            className="border-accent/40 bg-surface-raised text-accent inline-flex h-8 w-8 items-center justify-center rounded-md border"
          >
            P4
          </span>
          <span>
            PACK<span className="text-accent">402</span>
          </span>
        </Link>
        <nav aria-label="Primary" className="text-muted hidden items-center gap-6 text-sm md:flex">
          <Link href="/packs" className="hover:text-foreground">
            Marketplace
          </Link>
          <AuthAwareNavLink />
          <Link href="/fairness" className="hover:text-foreground">
            Provably Fair
          </Link>
          <Link href="/odds" className="hover:text-foreground">
            Odds Library
          </Link>
          <Link href="/responsible-purchasing" className="hover:text-foreground">
            Responsible Purchasing
          </Link>
        </nav>
        <div className="flex items-center gap-3">
          <AuthAwareHeaderActions
            signedInSlot={<LogoutButton />}
            signedOutSlot={
              <GoogleSignInButton
                callbackUrl="/"
                className="border-border-subtle text-foreground hover:border-accent/50 rounded-md border px-3 py-1.5 text-sm"
              />
            }
          />
        </div>
      </div>
    </header>
  );
}

function SiteFooter() {
  return (
    <footer className="border-border-subtle bg-surface border-t">
      <div className="text-muted mx-auto grid max-w-6xl gap-8 px-6 py-10 text-sm sm:grid-cols-2 md:grid-cols-4">
        <div>
          <p className="text-foreground mb-3 font-semibold">PackX402</p>
          <p>Open. Verify. Collect.</p>
        </div>
        <div>
          <p className="text-foreground mb-3 font-semibold">Legal</p>
          <ul className="space-y-2">
            <li>
              <Link href="/legal/terms" className="hover:text-foreground">
                Terms of Service
              </Link>
            </li>
            <li>
              <Link href="/legal/privacy" className="hover:text-foreground">
                Privacy Policy
              </Link>
            </li>
            <li>
              <Link href="/legal/responsible-purchasing" className="hover:text-foreground">
                Responsible Purchasing Policy
              </Link>
            </li>
            <li>
              <Link href="/legal/pack-rules" className="hover:text-foreground">
                Official Pack Rules
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <p className="text-foreground mb-3 font-semibold">Trust</p>
          <ul className="space-y-2">
            <li>
              <Link href="/fairness" className="hover:text-foreground">
                Provably Fair Center
              </Link>
            </li>
            <li>
              <Link href="/odds" className="hover:text-foreground">
                Odds Library
              </Link>
            </li>
            <li>
              <Link href="/status" className="hover:text-foreground">
                System Status
              </Link>
            </li>
            <li>
              <Link href="/security" className="hover:text-foreground">
                Security &amp; Vulnerability Disclosure
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <p className="text-foreground mb-3 font-semibold">Support</p>
          <ul className="space-y-2">
            <li>
              <Link href="/support" className="hover:text-foreground">
                Help Center
              </Link>
            </li>
            <li>
              <Link href="/responsible-purchasing" className="hover:text-foreground">
                Responsible Purchasing
              </Link>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-border-subtle text-muted border-t px-6 py-4 text-xs">
        <p className="mx-auto max-w-6xl">
          PackX402 packs contain randomized physical trading cards. Card values can change and are
          not guaranteed. PackX402 is not an investment platform. Beta software — see
          docs/LEGAL_REVIEW_REQUIRED.md.
        </p>
      </div>
    </footer>
  );
}
