# M08 — Router surface + contract test (Part B, core)

## Read first
F13, F17, rules A1, A6–A9.

## File
`core/surface.ts` — `withSurface(scope)` adds, on top of M06/M07:
- A6 `get/post/put/patch(url, data?, params?)`, `delete(url, params?)` → `visit`.
- A7 `poll(interval, params, options)` → `{ stop, start }`; polls stopped on dispose (hook into L3).
- A8 `remember/restore`, in-memory, namespaced; cleared on dispose.
- A9 stubs: `prefetch` (warn once), `getCached`/`getPrefetching` → `null`, `flush`.
- A marker `__scope: true` (used by R4).

`createScope()` returns `withSurface(...)` so callers always get the full surface.

## Tests
- `tests/surface.contract.test.ts` — **the contract**: for every method name in the
  adapter's `RouterSurface` (list it once in the test, copied from F13), assert the scope has a
  function with that name. When Part A changes the list in M09, this test must change too.
- A6 signatures route to `visit` with the right method/data. A7 with fake timers. A8. A9.
