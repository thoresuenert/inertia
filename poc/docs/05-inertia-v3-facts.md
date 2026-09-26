# 05 — What we rely on in Inertia 3.7

Checked by reading the source of v3.7.1. **M00 re-verified every fact in the fork** (2026-09-26)
and marked it ✅/❌. If a fact is ❌, stop — rules may need to change first.

## Core (used by Part B)

| # | ✓ | Fact | Source | Used in |
|---|---|---|---|---|
| F1 | ✅ | `http.getClient().request({ method, url, data?, params?, headers?, signal? })` → `{ status, data: string, headers }` | `core/src/http.ts`, `types.ts:18-38` | transport |
| F2 | ✅ | The default XHR client runs `http.onRequest` handlers and sets the XSRF header from the `XSRF-TOKEN` cookie | `core/src/xhrHttpClient.ts:89,115-118` | transport |
| F3 | ✅ | Status ≥ 400 rejects with `HttpResponseError` (has `.response`); network failure rejects with `HttpNetworkError` | `xhrHttpClient.ts:165,174`, `httpErrors.ts` | transport |
| F4 | ✅ | Aborting via `signal` rejects with **`HttpCancelledError`** (`code: 'ERR_CANCELLED'`, from `core/src/httpErrors.ts`) | `xhrHttpClient.ts:160-164`, `httpErrors.ts:25-30` | transport, C1 |
| F5 | ✅ | Response header keys are lower-case (`x-inertia`) — `parseHeaders` calls `.toLowerCase()` | `xhrHttpClient.ts:29` | transport |
| F6 | ✅ | `router.push/replace({ component, url, props, flash, preserveScroll, preserveState })` — client-side visit, no request. Full `ClientSideVisitOptions` also has `clearHistory, encryptHistory, errorBag, viewTransition, onError, onFinish, onFlash, onSuccess` | `router.ts:468-470,529-531`, `types.ts:267-282` | T6 |
| F7 | ✅ | `router.resolveComponent(name)` → Promise of the component | `router.ts:464-466` | RouterScope |
| F8 | ✅ | `router.reload({ only })` partial reload of the root | `router.ts:148-150` | T6 |
| F9 | ✅ | `router.on('navigate', e => e.detail.page.url)` returns an unsubscribe fn; `router.push` fires `navigate`. **Caveat: `router.replace` does NOT fire it** (`page.set` fires only `if (!replace)`, `page.ts:165-166`). Verified at runtime in the playground. L5 must not rely on `navigate` for replace-visits; note T6 applies pages via `replace` when the URL is unchanged — no `navigate` fires then, which is fine (same URL ⇒ same pathname ⇒ scope stays anyway). | `router.ts:182-191`, `page.ts:165` | L5 |
| F10 | ✅ | Page object: `component, props (incl. errors), url, version, rescuedProps, deferredProps?, flash`. Note: `rescuedProps`, `flash` and `rememberedState` are **required** in core's `Page`; many more optional fields (`mergeProps`, `deepMergeProps`, `onceProps`, `scrollProps`, …) exist and are ignored by the PoC (see D-03 gap) | `types.ts:226-260` | types |

## React adapter (used by Part A)

| # | ✓ | Fact | Source |
|---|---|---|---|
| F13 | ✅ | Direct `router` usage in exactly 7 component/hook files: `Deferred` (on start/finish; imports `router` via `'.'` re-export), `Link` (visit, prefetch), `WhenVisible` (reload), `useForm` (`router[method]`, delete), `usePoll` (poll), `usePrefetch` (getCached, getPrefetching, on prefetching/prefetched, flush), `useRemember` (remember, restore). Plus `App.ts` (init, on navigate/clientVisit) and `createInertiaApp.ts` (decryptHistory) — root only. `Form.ts`, `WhenMounted.ts`, `Head.ts`, `InfiniteScroll.ts` are clean. | `packages/react/src/*` |
| F14 | ✅ | `usePage()` reads `PageContext` (not exported today); `App.ts` provides it | `usePage.ts:3,6`, `PageContext.ts`, `App.ts:245-246` |
| F15 | ✅ | `Deferred` reads `page.rescuedProps` and on `start` checks `visit.preserveState === true`, `isSameUrlWithoutQueryOrHash(visit.url, window.location)` and the partial keys; it tracks visit objects in a `Set` until `finish` | `Deferred.ts:28-54` |
| F16 | ✅ | `Link` builds its URL with `mergeDataIntoQueryString`, and core's `hrefToUrl` resolves relative hrefs against `window.location` | `Link.ts:99-102`, `core/src/url.ts:14-16` |
| F17 | ✅ | `useForm` passes `onCancelToken, onBefore, onStart, onProgress, onSuccess (awaited), onError, onCancel, onFinish` (plus `optimistic` and `data`) and reads nothing else from the router | `useForm.ts:161-229` |
| F18 | ✅ | `InfiniteScroll` uses core's own `router` import (`core/src/infiniteScroll/{data,elements,queryString}.ts`) → cannot be scoped from the adapter | core |

## Repo / tooling

| # | ✓ | Fact | Source |
|---|---|---|---|
| F19 | ✅ | pnpm workspace includes `packages/*` and `playgrounds/*`; the playground depends on `@inertiajs/core`/`react` via `workspace:*` → single core copy (`node_modules/@inertiajs/core` is a symlink to `packages/core`) | `pnpm-workspace.yaml`, `playgrounds/react/package.json` |
| F20 | ✅ | `packages/react` builds with `./build.js` (esbuild) + `tsc`; `pnpm dev:react` watches | `packages/react/package.json` |
| F21 | ✅ | React E2E: `pnpm test:react` runs Playwright against `tests/app` (Node server) | root `package.json`, `playwright.config.ts:62` |
| F22 | ✅ | Playground: Laravel 13 (`laravel/framework ^13.0`), React 19, Vite 8, SQLite, `./init.sh`, models `User`, `Todo` (plus `ChatMessage`) | `playgrounds/react` |

## M00 environment notes

- Repo requires pnpm ≥ 11.1.1 and Node ≥ 22 for pnpm 11 itself. Local default is
  Volta node 20.19.4 + pnpm 10; use e.g. `volta run --node 24.13.1 -- npx -y pnpm@11 <cmd>`.
- Vite resolves `@inertiajs-poc/scope` straight to `packages/scope/src/index.ts` and
  transpiles the TS source — **no build step needed** (verified via the dev server).

## Not used on purpose
`interceptors.*` (internal), anything under `dist/`, core internals.
