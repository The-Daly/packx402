// Test-only shim: the real `server-only` package unconditionally throws unless resolved
// under Next.js's RSC "react-server" bundler condition, which Vitest does not set. This
// no-op lets app code that legitimately imports "server-only" (see src/server/env.ts) be
// unit-tested directly instead of forking a parallel unguarded copy of every module.
export {};
