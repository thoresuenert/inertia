# M10 — `<RouterScope>` (Part B, react)

## Read first
Rules L6, R1–R4, D-11.

## File
`packages/scope/src/react/RouterScope.tsx` — props `url`, `name?`, `fallback?`, `onDispose?`.
- L6: create the scope in `useEffect` with `createTransport()`, `createRootAdapter()`,
  `getVersion` (from the root `usePage().version`, kept in a ref), `parent` per R4.
- Subscribe to the scope page with `useSyncExternalStore`.
- R1: render fallback → resolved component inside
  `<RouterProvider value={scope as unknown as RouterSurface}>` and `<PageProvider value={page}>`.
- R2 `key={page.component}`. R3 `onDispose` only for self-disposal.

Note: `usePage()` for `getVersion` must be read **outside** the provider, i.e. in
`RouterScope` itself, which renders in the parent's page context.

## Tests (`tests/react/RouterScope.test.tsx`, jsdom + Testing Library — ask before adding)
Inject a fake transport (e.g. an optional `transport` prop marked `@internal`, or a module
mock — propose one and ask).
- R1 fallback then component; inside it `usePage()` returns the scope page and
  `useRouter()` returns the scope.
- R2, R3. L6 under `<StrictMode>`: one live scope; unmount disposes.
- R4: a `RouterScope` inside a `RouterScope` gets the outer scope as parent.
