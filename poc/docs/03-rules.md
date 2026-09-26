# 03 — Behaviour rules

Every rule has an ID. Test names start with it (`it('C1: ...')`). If code and rule disagree,
the rule wins — or the rule is changed on purpose, here, first.

## K — Adapter change (Part A)

- **K1** `RouterContext` defaults to the global `router`. Without a provider nothing changes.
- **K2** `useRouter()` returns the context value. It is a hook: call it at the top level of
  components/hooks only.
- **K3** `Deferred`, `Link`, `WhenVisible`, `useForm`, `usePoll`, `usePrefetch`,
  `useRemember` use `useRouter()` instead of the imported `router`. No other changes.
- **K4** `index.ts` exports `useRouter`, `RouterProvider`, `PageProvider`, type `RouterSurface`.
- **K5** `Deferred` compares `visit.url` with `usePage().url` instead of `window.location`
  (otherwise it never shows "reloading" inside a scope). For the root, both are the same URL,
  so root behaviour is unchanged.
- **K6** `App.ts`, `createInertiaApp.ts`, `InfiniteScroll.ts` and `packages/core` are untouched.
- **K7** The existing React Playwright suite passes unchanged.

## A — Adapter compatibility (Part B must satisfy what Part A calls)

- **A1** A scope implements the full `RouterSurface` (list in `02-architecture.md`).
- **A2** Unknown visit params (e.g. `preserveScroll`, `replace`, `async`, `optimistic`,
  `prefetch`, `viewTransition`) are ignored silently.
- **A3** Callbacks and events receive a `ScopeVisit` object (see types). The **same object**
  is used for `start` and `finish` of one visit (`Deferred` tracks visits in a `Set`).
- **A4** `onCancelToken({ cancel })` is called before `onStart`. `cancel()` aborts the visit (→ P6).
- **A5** Events are delivered as `{ detail: { visit } }` (or `{ detail: { page, visit } }` for
  `success`), like Inertia's `CustomEvent`s. `on()` returns an unsubscribe function.
- **A6** Signatures: `get/post/put/patch(url, data?, params?)`, `delete(url, params?)`,
  `visit(url, params?)`, `reload(params?)`.
- **A7** `poll(interval, params, { keepAlive?, autoStart? })` returns `{ stop, start }`,
  runs `reload(params)` every `interval` ms, and is stopped on dispose.
- **A8** `remember(data, key)` / `restore(key)` store in memory, namespaced by scope id.
- **A9** `prefetch` is a no-op (dev `console.warn` once), `getCached`/`getPrefetching` return
  `null`, `flush` is a no-op.

## L — Lifecycle

- **L1** Create with `url` (initial GET) or `page` (ready at once). Neither or both → throw.
- **L2** `status()`: `loading` → `ready` after the first applied page → `disposed`.
  `ready()` resolves with the first page; rejects if disposed first or the initial load fails.
- **L3** `dispose()` order: abort in-flight requests (no `onCancel`), stop polls, dispose
  child scopes, emit `dispose`, remove listeners, clear remembered state, status `disposed`.
  Idempotent.
- **L4** After dispose, visit methods do nothing and `console.warn` in development.
- **L5** A scope whose parent is the root disposes itself when the root navigates to a
  different pathname. Same pathname (e.g. a root partial reload) → keep.
- **L6** `<RouterScope>` creates the scope in `useEffect`, disposes in cleanup (StrictMode-safe).

## C — Concurrency

- **C1** A new GET aborts an in-flight GET of the same scope ("latest wins"); the aborted
  visit gets `onCancel` + `onFinish` and a `cancel` event.
- **C2** While a non-GET is in flight, every new visit is ignored with `console.warn`.
- **C3** Starting a non-GET aborts an in-flight GET (as C1).
- **C4** Responses of aborted requests are never applied.
- **C5** `reload(params)` is a GET to the current scope URL.

## U — URLs

- **U1** Relative URLs passed to the scope resolve against the **scope page URL**, not the
  browser URL. Note: Inertia's `Link` may already have absolutised an href against
  `window.location` (F16) — demo pages use absolute paths like `/scopes/users?page=2`
  (Laravel's paginator produces full URLs anyway).
- **U2** GET: `data` merges into the query string (existing keys overwritten, `null`/`undefined`
  skipped, arrays as `key[]=`). Nested objects → throw. Non-GET: `data` as JSON body.

## Q — Requests

- **Q1** Headers come from `buildHeaders()` (`04-protocol.md`).
- **Q2** `only`/`except` produce partial headers with the **current scope component**;
  ignored on the initial load.
- **Q3** The version comes from `deps.getVersion()` when the request is sent.
- **Q4** `onBefore` returning `false` or a `before` listener returning `false` cancels the
  visit before anything is sent; no further callbacks.

## P — Responses (classified in `transport.ts`)

| Result | When | Scope does |
|---|---|---|
| `page` | 2xx + header `x-inertia: true` | → T rules |
| `location` | 409 + `x-inertia-location` | `root.hardVisit(url)` (**P2**) |
| `invalid` | 2xx without `x-inertia`, or bad JSON | emit `error`, page unchanged (**P3**) |
| `http` | status ≥ 400 | emit `error`, page unchanged (**P4**) |
| `network` | network failure | emit `error`, page unchanged (**P5**) |
| `aborted` | aborted | `onCancel`, `cancel` event (**P6**) |

- **P1** `onFinish` fires exactly once for every visit that started.

## T — Targets

- **T1** Response header `x-inertia-scope-target` (`self|parent|root`) wins; other values ignored.
- **T2** Same pathname as the scope page URL → `self`.
- **T3** Same pathname as the parent URL (parent scope page URL, or current root URL) → `parent`.
- **T4** Otherwise → `root`.
- **T5** `self`: `applyPage(current, incoming, { partial })`. Partial + same component →
  `props = { ...current.props, ...incoming.props }`; otherwise replace. `errors` always from
  incoming (default `{}`), `rescuedProps` default `[]`. Then errors non-empty → `onError`,
  else `onSuccess(page)`.
- **T6** `parent` with root parent, or `root`: `root.replace(page)` if the URL equals the
  current root URL, else `root.push(page)` (with `preserveScroll`/`preserveState` true). Then
  `onSuccess`, then dispose. If the page has `deferredProps`: `root.reload(allDeferredKeys)`.
- **T7** `parent` with a scope parent: `parent.applyPage(page)`, `onSuccess`, dispose.
- **T8** A `success` event is emitted for every applied page.

## D — Deferred props (M12)

- **D1** After a `self` apply, collect deferred keys whose prop is `undefined`.
- **D2** If any: one `reload({ only: keys })` (a normal GET, C1 applies).
- **D3** Because of D1, a deferred load aborted by a search is retried after the search applies.

## S — Server (Laravel)

- **S1** Middleware does nothing without `X-Inertia-Scope`.
- **S2** Scoped requests: `Referer` := `X-Inertia-Scope-Url`, so `back()` and validation
  redirects go to the scope URL.
- **S3** If session `_inertia_scope_target` or request attribute `inertia_scope_target` is set,
  the response gets `X-Inertia-Scope-Target`; the session key is removed.
- **S4** `RedirectResponse::withScopeTarget($t)` flashes `_inertia_scope_target`; invalid → throw.
- **S5** `Redirector::toScopeParent()` → `X-Inertia-Scope-Parent-Url`, else like `back()`.

## R — `<RouterScope>`

- **R1** Renders `fallback` until ready, then the component from
  `router.resolveComponent(page.component)` with the page props, inside `RouterProvider`
  (the scope) and `PageProvider` (the scope page).
- **R2** When `page.component` changes, the component remounts (`key={component}`).
- **R3** `onDispose` fires when the scope disposes itself (T6/T7/L5), not on normal unmount.
- **R4** The parent scope is taken from `useRouter()` if it is a scope (check a marker
  property, e.g. `__scope === true`), else the parent is the root.
