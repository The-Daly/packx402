import { InteractivePackDemo } from "@/components/pack-art/InteractivePackDemo";
import { ConnectPeraButton } from "@/components/wallet/ConnectPeraButton";

/**
 * No-database preview of the full carousel-select -> rip -> spin -> reveal sequence, for
 * local demoing when Postgres isn't running (the real /packs/[tierKey]/open page 404s
 * without a live DB — this page never touches it). Dev-only, not linked from anywhere in
 * the real app. The same InteractivePackDemo also appears on the real landing page.
 */
export default function RipPreviewPage() {
  return (
    <div className="mx-auto max-w-sm px-6 py-12">
      <h1 className="mb-6 text-center text-xl font-semibold">Rip-open animation preview</h1>

      <div className="mb-6 flex justify-center">
        <ConnectPeraButton />
      </div>

      <InteractivePackDemo />
    </div>
  );
}
