# M07 — Scope part 2: concurrency, targets, dispose (Part B, core)

## Read first
Rules C1–C5, T1–T7, L3–L5, P2.

## Changes
- `createScope.ts`: `currentGet` / `currentSubmit` AbortControllers; C1–C5.
- `handleResult.ts`: `resolveTarget()`; T6 (root adapter), T7 (`parent.applyPage`), P2.
- Dispose L3/L4. Child scopes register with their parent (`deps.parent`) for L3.
- L5: subscribe to `root.onNavigate` only when there is no parent scope.

If `createScope.ts` passes ~150 lines, move concurrency into `core/concurrency.ts`.

## Tests (`tests/createScope.advanced.test.ts`) with `deferredTransport()`
- C1–C5 one each. T1–T4 end-to-end; T6 push vs replace; T6 deferred reload; T7.
- L3 order (spy log), idempotent, children disposed; L4 warns; L5 both cases. P2.
