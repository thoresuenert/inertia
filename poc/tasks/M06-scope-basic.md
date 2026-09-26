# M06 — Scope part 1: load, visit lifecycle, apply to self (Part B, core)

## Read first
`docs/02-architecture.md` (Scope API), rules L1, L2, Q1–Q4, U1, U2, T5, T8, A2–A5, P1.

## Files
- `core/runVisit.ts` — one visit, in this order:
  build `ScopeVisit` (A3) → `onBefore` / `before` event (Q4) → `onCancelToken` (A4) →
  `onStart` + `start` event → `transport.send` → `handleResult` → `onFinish` + `finish` event (P1).
  Same `ScopeVisit` object for start and finish (A3).
- `core/handleResult.ts` — for now: `page` → **always `self`** (T5, T8); error kinds →
  `error` event (P3–P5); `aborted` → `onCancel` + `cancel` event (P6).
- `core/createScope.ts` — state (status, page store, emitter), initial load (L1, L2),
  `ready()`, `visit(url, params)`, `reload(params)`, `on()`, `applyPage()`.

## In this milestone
- No concurrency rules yet; a second visit just starts.
- Only `visit` and `reload` — the other methods come in M08.

## Tests (`tests/createScope.basic.test.ts`), with a fake `Transport`
- L1 throws (neither/both); L2 status + `ready()` resolve/reject.
- Q2 partial headers use current component, ignored on initial load. Q3 version read at send.
- Q4 cancel via `onBefore` and via `before` listener.
- A3 same object for start/finish; A4 cancel token before start and `cancel()` aborts.
- A2 unknown params ignored. U1 relative URL against scope URL. U2 GET data merged.
- T5 onError vs onSuccess; T8 success event; P1 onFinish once (incl. error cases).
