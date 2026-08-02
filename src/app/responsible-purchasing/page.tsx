export const metadata = { title: "Responsible Purchasing — PackX402" };

export default function ResponsiblePurchasingPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="text-3xl font-semibold">Responsible Purchasing</h1>
      <p className="text-muted mt-3 text-sm">
        PackX402 packs are randomized physical products. Card values can change and are not
        guaranteed — PackX402 is not an investment platform. These controls are always available
        from your account.
      </p>

      <div className="mt-8 space-y-4">
        <Control
          title="Daily / weekly / monthly purchase limits"
          body="Set a maximum you can spend per day, week, and month. Limit decreases apply immediately; increases apply only after a cooling-off period."
        />
        <Control
          title="Cool-off period"
          body="Temporarily block new purchases for a period you choose, without pausing your whole account."
        />
        <Control
          title="Temporary account pause"
          body="Pause purchasing entirely. You can still browse your collection and manage shipping."
        />
        <Control
          title="Self-exclusion"
          body="Self-exclusion blocks all paid and promotional randomized purchases across every wallet and verified account you control, and cannot be manually overridden without a documented review."
        />
      </div>

      <p className="text-muted mt-8 text-sm">
        Need help? Visit{" "}
        <a href="/support" className="text-accent hover:text-accent-strong">
          Support
        </a>{" "}
        or contact a responsible-gambling resource such as the National Council on Problem Gambling
        (1-800-522-4700) — while PackX402 is not gambling, the same support resources can help with
        compulsive-spending patterns.
      </p>
    </div>
  );
}

function Control({ title, body }: { title: string; body: string }) {
  return (
    <div className="border-border-subtle bg-surface rounded-lg border p-5">
      <h2 className="font-semibold">{title}</h2>
      <p className="text-muted mt-1 text-sm">{body}</p>
    </div>
  );
}
