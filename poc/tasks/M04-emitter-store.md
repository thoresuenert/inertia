# M04 — Emitter + store (Part B, pure)

## Read first
Rule A5.

## Files
- `pure/emitter.ts` — `createEmitter<Details extends Record<string, unknown>>()`:
  - `on(name, listener) => unsubscribe` — listener receives `{ detail }` (A5).
  - `emit(name, detail): boolean` — `false` if any listener returned `false` (for `before`).
  - `clear()`.
- `pure/store.ts` — `createStore<T>(initial)`: `get()`, `set(value)`,
  `subscribe(listener) => unsubscribe`. Compatible with React `useSyncExternalStore`.

## Tests
- A5: listener gets `{ detail }`; unsubscribe; clear.
- `emit` false when one listener returns false; all listeners still run.
- A throwing listener does not stop the others (`console.error`).
- store: notify on set, not after unsubscribe, not when setting the same reference.
