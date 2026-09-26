# M00 — Fork setup, scope package skeleton, verify facts

## Steps
1. Repo: `pnpm install`, `pnpm build:all`, then `cd playgrounds/react && ./init.sh && composer run dev`.
   Confirm the playground runs in the browser. Report any setup problems before continuing.
2. Create `packages/scope/` as private workspace package `@inertiajs-poc/scope`:
   `package.json` (type module, `exports: { ".": "./src/index.ts" }`, peer deps
   `@inertiajs/core`, `@inertiajs/react`, `react`), `tsconfig.json` (copy style from
   `packages/react`), `vitest.config.ts`, empty `src/index.ts`, one smoke test.
3. Add `"@inertiajs-poc/scope": "workspace:*"` to `playgrounds/react/package.json`, `pnpm install`.
   Import something trivial from it in a playground page and confirm Vite compiles the TS
   source without a build step. If not, report and propose an esbuild build like `packages/react`.
4. Verify F1–F22 in `docs/05-inertia-v3-facts.md` against the fork. Mark ✅/❌ with a note.
   For F9 write a tiny throwaway check in the playground (don't commit it).
5. Check there is exactly one `@inertiajs/core` in the playground: `pnpm why @inertiajs/core`
   inside `playgrounds/react`.

## Acceptance
- `pnpm --filter @inertiajs-poc/scope test` passes.
- Facts file updated. Any ❌ reported — **stop** in that case.

## Out of scope
Real code.
