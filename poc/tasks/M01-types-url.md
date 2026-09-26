# M01 — Types + URL helpers (Part B, pure)

## Read first
`docs/02-architecture.md` (Key types), rules U1, U2.

## Files (`packages/scope/src/pure/`)
- `types.ts` — `Method`, `Target`, `ScopePage`, `VisitParams`, `ScopeVisit`,
  `ScopeEventName` (`before|start|success|error|cancel|finish|dispose`), `ScopeEventDetail`
  per event. Types only.
- `url.ts`
  - `toUrl(href: string, base: string): URL` — U1: relative resolves against `base`.
  - `samePath(a: string, b: string, base: string): boolean` — pathnames only; decide on
    trailing slashes, document it in the file header, test it.
  - `mergeQuery(href: string, data: Record<string, unknown>, base: string): string` — U2.
    Returns an absolute URL string.

`base` is always passed in explicitly — no `window` in pure code.

## Tests (`packages/scope/tests/url.test.ts`)
- U1: relative `?page=2` against a scope URL keeps the scope path.
- samePath: same path/different query → true; trailing slash rule.
- U2: overwrite, keep others, skip null/undefined, arrays, nested object throws.
