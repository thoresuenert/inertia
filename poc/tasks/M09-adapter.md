# M09 — Adapter change: router from context (Part A)

This is the **upstream candidate**. Minimal, behaviour-neutral, existing style.

## Read first
Rules K1–K7, F13–F16, `CLAUDE.md` rule 5.

## Changes in `packages/react/src/`
1. `RouterContext.ts`: `createContext<RouterSurface>(router)`, `displayName = 'InertiaRouterContext'`.
   Define `RouterSurface = Pick<Router, ...>` with exactly the methods from F13.
2. `useRouter.ts`: `export default function useRouter() { return use(RouterContext) }`
   (match how `usePage` uses `use`).
3. In `Deferred`, `Link`, `WhenVisible`, `useForm`, `usePoll`, `usePrefetch`, `useRemember`:
   `const router = useRouter()` at the top of the component/hook, remove the `router` import.
   Nothing else. Add `router` to effect dependency arrays where it is used inside effects.
4. `Deferred.ts` K5: use `usePage().url` instead of `window.location` in the same-URL check.
5. `index.ts` K4: export `useRouter`, `RouterProvider` (`RouterContext.Provider`),
   `PageProvider` (`PageContext.Provider`), `type RouterSurface`.

## Verify
- `pnpm --filter @inertiajs/react build` (includes `tsc`) passes.
- K7: `pnpm test:react` passes. It is a long Playwright run: first run it on an unchanged
  checkout to know the baseline (note flaky tests), then with the change.
- Update the M08 contract test list if `RouterSurface` differs from F13.
- Show the human `git diff --stat main -- packages/react` and the full diff.

## Out of scope
Any change to core, Vue, Svelte; renaming; refactoring; `InfiniteScroll` (D-09).
