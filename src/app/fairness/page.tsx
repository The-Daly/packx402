import { VerifierForm } from "./VerifierForm";

export const metadata = { title: "Provably Fair Center — PackX402" };

export default function FairnessPage() {
  return (
    <div className="mx-auto max-w-4xl px-6 py-12">
      <h1 className="text-3xl font-semibold">Provably Fair Center</h1>
      <p className="text-muted mt-3 max-w-2xl text-sm">
        Every pack opening is determined by a deterministic algorithm you can reproduce yourself —
        no trust in PackX402 required.
      </p>

      <section className="mt-10">
        <h2 className="text-xl font-semibold">Plain-language explanation</h2>
        <ol className="text-muted mt-4 space-y-3 text-sm">
          <li>
            <strong className="text-foreground">1. Before you pay:</strong> PackX402 generates a
            secret server seed and publishes only its hash (a &ldquo;commitment&rdquo;) along with
            the pool&apos;s hash and odds hash. PackX402 cannot change the seed after this point
            without the commitment no longer matching.
          </li>
          <li>
            <strong className="text-foreground">2. You pay:</strong> your payment settles on-chain
            and produces a payment identifier and a piece of post-settlement chain randomness (for
            example, the hash of the block that confirmed your transaction) that nobody — including
            PackX402 — could have predicted beforehand.
          </li>
          <li>
            <strong className="text-foreground">3. The seed is revealed:</strong> PackX402 publishes
            the server seed. Combined with your client nonce, the payment identifier, the chain
            randomness, and the pool hash, a single sha256 hash determines your card by walking the
            pool&apos;s published probability weights.
          </li>
          <li>
            <strong className="text-foreground">4. You verify:</strong> recompute the same hash
            yourself (or use the verifier below) and confirm it selects the same card PackX402
            showed you.
          </li>
        </ol>
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-semibold">Technical explanation</h2>
        <p className="text-muted mt-3 text-sm">
          <code className="text-accent">
            combinedSeedHash = sha256(serverSeed | clientNonce | paymentId | chainRandomness |
            poolHash)
          </code>
          . The first 64 bits of that digest, reduced modulo the pool&apos;s total weight, is the{" "}
          <code className="text-accent">selectionRoll</code>. Pool entries are walked in ascending{" "}
          <code className="text-accent">id</code> order, accumulating weight, until the roll falls
          inside an entry&apos;s band. The full reference implementation and fixed test vectors are
          published in{" "}
          <a
            href="https://github.com/The-Daly/packx402/blob/main/docs/FAIRNESS_PROTOCOL.md"
            className="text-accent hover:text-accent-strong"
          >
            docs/FAIRNESS_PROTOCOL.md
          </a>
          .
        </p>
      </section>

      <section className="mt-10">
        <h2 className="mb-4 text-xl font-semibold">Verify a completed pull</h2>
        <VerifierForm />
      </section>
    </div>
  );
}
