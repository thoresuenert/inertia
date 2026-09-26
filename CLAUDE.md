# CLAUDE.md — Router Scopes PoC (fork of inertiajs/inertia)

You are helping a solo developer build a proof of concept. The developer must be able to
read and understand **every line**. Optimise for clarity, not cleverness.

## Where things live

| What | Path |
|---|---|
| Specs (source of truth) | `poc/docs/` |
| Milestones | `poc/tasks/` |
| Part A — adapter change | `packages/react/src/` |
| Part B — scope library | `packages/scope/src/{pure,core,react}/`, tests in `packages/scope/tests/` |
| Part C — demo app | `playgrounds/react/` (PHP in `app/Support/InertiaScope/`, pages in `resources/js/Pages/Scopes/`) |

Never modify `packages/core`, `packages/vue3`, `packages/svelte`, `packages/vite`.

## Hard rules

1. **Only do the current milestone** (`poc/tasks/MXX-*.md`). Do not start the next one.
2. **Plan first.** List files and functions (with signatures) and wait for approval.
3. **Small pieces.** Max ~150 lines per file, ~30 lines per function, one concept per file.
4. **Part B layers point downward only:** `pure` ← `core` ← `react`. `pure` imports neither
   React nor `@inertiajs/*`.
5. **Part A must stay minimal and behaviour-neutral.** Without a provider, everything behaves
   exactly as before. No refactors, renames or formatting changes beyond what the task says.
   Follow the existing code style of `packages/react` (run `pnpm format` on touched files only).
6. **Public exports only** from `@inertiajs/*` in Part B and C. No `dist/` or `src/` deep imports.
7. **No new dependencies** without asking. Allowed without asking in `packages/scope`
   (dev only): vitest, jsdom, @testing-library/react.
8. **Tests with every change.** Each rule you implement (IDs like `C1`, `A4`) gets at least one
   test whose name starts with the ID: `it('C1: new GET aborts in-flight GET')`.
9. **Inject dependencies** (transport, root adapter, version getter) — never reach for globals
   inside `core/` logic.
10. **No speculative features.** Spec unclear or wrong → stop and ask. Don't guess.
11. Plain TypeScript: functions and small objects, no class hierarchies, explicit names.

## Comments
Each file starts with 2–4 lines: what it does, which rule IDs it implements. Comment *why*.

## Commands
- Scope library: `pnpm --filter @inertiajs-poc/scope test`
- Adapter build + types: `pnpm --filter @inertiajs/react build`
- Adapter regression suite: `pnpm test:react` (Playwright, see `poc/tasks/M09-*.md`)
- Demo app: `cd playgrounds/react && composer run dev`, PHP tests `php artisan test --filter=InertiaScope`

## Finishing a milestone
Run the relevant tests, then summarise: files + line counts, rule IDs and where they are
tested, what you were unsure about or left out, and one paragraph "how to read this code".
