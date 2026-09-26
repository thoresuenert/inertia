# 06 — Decisions

## D-01 Fork only the React adapter, not core
The RFC's core refactor (singletons → instances) is large and hard to review. The adapter
change (router from context) is ~100 lines and already lets Inertia's own components work
in a scope. That is the claim we need to prove. Core stays untouched.

## D-02 The scope router lives in its own package
`packages/scope` is prototype code, not an upstream proposal. Keeping it separate keeps the
Part A diff small and rebasable, so it can become the upstream PR for RFC step 1.

## D-03 Responses for the root are applied with `router.push/replace`
No second request; flash messages survive. Gap: merge/deep-merge/once props of that page are
not handled; deferred props are loaded with one `reload` (T6).

## D-04 Simple concurrency
GET: latest wins. Non-GET: one at a time, everything else ignored meanwhile (C1–C3).

## D-05 No history integration
Browser back does not close a modal; the URL bar never shows the modal URL.

## D-06 JSON bodies only
No `FormData`/uploads. `useForm` with files inside a scope is a known gap.

## D-07 No shared-prop trimming on the server
Scoped requests get all shared props. The page JSON stays complete, which D-03 needs.

## D-08 Prefetching is stubbed in scopes
`Link prefetch` inside a scope does nothing (A9). Prefetch cache keys would need the scope.

## D-09 `InfiniteScroll` is out of scope
It uses core's router directly (F18). Documenting this is itself a finding for the RFC:
it shows why RFC step 2 (core refactor) is needed for full coverage.

## D-10 Sandbox = the repo's own `playgrounds/react`
It is a fresh Laravel 13 app that already consumes the local packages through pnpm
workspaces (F19), so there is exactly one `@inertiajs/core`. Demo code stays in a `/scopes`
route group and `Pages/Scopes/` so it does not mix with existing playground pages.

Alternative (not chosen): a separate `laravel new` app linking the fork with
`"@inertiajs/react": "link:../inertia/packages/react"` (same for core and scope). Then you
**must** alias/dedupe `@inertiajs/core` in `vite.config.ts` (`resolve.dedupe: ['@inertiajs/core', 'react', 'react-dom']`)
and run `pnpm dev:react` in the fork. More moving parts, easier to get two routers.

## D-11 One cast between scope and `RouterSurface`
Matching the core router's generic signatures exactly in the scope is not worth the
complexity. One `as unknown as RouterSurface` in `RouterScope.tsx`; the M08 contract test
checks the runtime shape instead.
