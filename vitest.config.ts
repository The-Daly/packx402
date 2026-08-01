import path from "node:path";
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "server-only": path.resolve(__dirname, "./vitest/shims/server-only.ts"),
    },
  },
  test: {
    // Default to the "node" environment: most of this suite is server-side business logic
    // (crypto, DB-shaped types, payment/fairness math), and jsdom's realm replaces global
    // typed-array constructors (Uint8Array etc.), which breaks `instanceof` checks inside
    // algosdk/tweetnacl in ways that fail silently or with confusing errors. Component
    // tests that need a DOM should opt in per-file with a `// @vitest-environment jsdom`
    // docblock comment at the top of the file.
    environment: "node",
    globals: true,
    include: ["src/**/*.test.{ts,tsx}"],
    setupFiles: ["./vitest.setup.ts"],
  },
});
