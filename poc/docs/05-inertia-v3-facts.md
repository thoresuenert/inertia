# 05 — What we rely on in Inertia 3.7

Checked by reading the source of v3.7.1. **M00 re-verifies every fact in the fork** and marks
it ✅/❌. If a fact is ❌, stop — rules may need to change first.

## Core (used by Part B)

| # | Fact | Source | Used in |
|---|---|---|---|
| F1 | `http.getClient().request({ method, url, data?, params?, headers?, signal? })` → `{ status, data: string, headers }` | `core/src/http.ts`, `types.ts` | transport |
| F2 | The default XHR client runs `http.onRequest` handlers and sets the XSRF header from the `XSRF-TOKEN` cookie | `core/src/xhrHttpClient.ts` | transport |
| F3 | Status ≥ 400 rejects with `HttpResponseError` (has `.response`); network failure rejects with `HttpNetworkError` | `xhrHttpClient.ts` | transport |
| F4 | Aborting via `signal` rejects — verify the error type | `xhrHttpClient.ts` | transport, C1 |
| F5 | Response header keys are lower-case (`x-inertia`) — verify `parseHeaders` | `xhrHttpClient.ts` | transport |
| F6 | `router.push/replace({ component, url, props, flash, preserveScroll, preserveState })` — client-side visit, no request | `router.ts`, `ClientSideVisitOptions` | T6 |
| F7 | `router.resolveComponent(name)` → Promise of the component | `router.ts` | RouterScope |
| F8 | `router.reload({ only })` partial reload of the root | `router.ts` | T6 |
| F9 | `router.on('navigate', e => e.detail.page.url)` returns an unsubscribe fn — verify `router.push` also fires it | `router.ts`, `events.ts` | L5 |
| F10 | Page object: `component, props (incl. errors), url, version, rescuedProps, deferredProps?, flash` | `types.ts` `Page` | types |

## React adapter (used by Part A)

| # | Fact | Source |
|---|---|---|
| F13 | Direct `router` usage in exactly 7 component/hook files: `Deferred` (on start/finish), `Link` (visit, prefetch), `WhenVisible` (reload), `useForm` (`router[method]`, delete), `usePoll` (poll), `usePrefetch` (getCached, getPrefetching, on prefetching/prefetched, flush), `useRemember` (remember, restore). Plus `App.ts`/`createInertiaApp.ts` (root only). | `packages/react/src/*` |
| F14 | `usePage()` reads `PageContext` (not exported today); `App.ts` provides it | `usePage.ts`, `PageContext.ts` |
| F15 | `Deferred` reads `page.rescuedProps` and on `start` checks `visit.preserveState === true`, `isSameUrlWithoutQueryOrHash(visit.url, window.location)` and the partial keys; it tracks visit objects in a `Set` until `finish` | `Deferred.ts` |
| F16 | `Link` builds its URL with `mergeDataIntoQueryString`, and core's `hrefToUrl` resolves relative hrefs against `window.location` | `Link.ts`, `core/src/url.ts` |
| F17 | `useForm` passes `onCancelToken, onBefore, onStart, onProgress, onSuccess (awaited), onError, onCancel, onFinish` and reads nothing else from the router | `useForm.ts` |
| F18 | `InfiniteScroll` uses core's own `router` import (`core/src/infiniteScroll/*`) → cannot be scoped from the adapter | core |

## Repo / tooling

| # | Fact | Source |
|---|---|---|
| F19 | pnpm workspace includes `packages/*` and `playgrounds/*`; the playground depends on `@inertiajs/core`/`react` via `workspace:*` → single core copy | `pnpm-workspace.yaml`, `playgrounds/react/package.json` |
| F20 | `packages/react` builds with `./build.js` (esbuild) + `tsc`; `pnpm dev:react` watches | `packages/react/package.json` |
| F21 | React E2E: `pnpm test:react` runs Playwright against `tests/app` (Node server) | root `package.json`, `playwright.js` |
| F22 | Playground: Laravel 13, React 19, Vite 8, SQLite, `./init.sh`, models `User`, `Todo` | `playgrounds/react` |

## Not used on purpose
`interceptors.*` (internal), anything under `dist/`, core internals.
