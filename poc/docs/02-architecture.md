# 02 — Architecture

## Part A — adapter change (`packages/react/src/`)

New files:

```
RouterContext.ts     createContext<RouterSurface>(router)   default = global router
useRouter.ts         useRouter(): RouterSurface             returns use(RouterContext)
```

`RouterSurface` is a type: the subset of the core `Router` the adapter uses (see F13):
`on, visit, get, post, put, patch, delete, reload, poll, remember, restore, prefetch,
getCached, getPrefetching, flush`. Define it with `Pick<Router, ...>` from `@inertiajs/core`.

Changed files (replace direct `router.` calls with `const router = useRouter()`):
`Deferred.ts`, `Link.ts`, `WhenVisible.ts`, `useForm.ts`, `usePoll.ts`, `usePrefetch.ts`,
`useRemember.ts`. Plus one fix in `Deferred.ts` (rule K5).

New exports in `index.ts`: `useRouter`, `RouterProvider` (= `RouterContext.Provider`),
`PageProvider` (= `PageContext.Provider`), type `RouterSurface`.

Untouched: `App.ts`, `createInertiaApp.ts`, `InfiniteScroll.ts`, `Head.ts`, everything in core.

## Part B — scope library (`packages/scope/`)

A private workspace package `@inertiajs-poc/scope`.

```
packages/scope/
├── package.json            name, type: module, exports ./src/index.ts, vitest
├── src/
│   ├── index.ts            public exports only
│   ├── pure/               imports nothing
│   │   ├── types.ts        ScopePage, Method, Target, VisitParams, ScopeVisit, events
│   │   ├── url.ts          toUrl, samePath, mergeQuery
│   │   ├── headers.ts      buildHeaders
│   │   ├── resolveTarget.ts
│   │   ├── applyPage.ts
│   │   ├── emitter.ts      Inertia-shaped events: listener receives { detail }
│   │   └── store.ts
│   ├── core/               imports pure + @inertiajs/core
│   │   ├── transport.ts    send one request, classify the result
│   │   ├── rootAdapter.ts  the few root-router calls we need
│   │   ├── handleResult.ts P and T rules
│   │   ├── runVisit.ts     one visit: before → cancelToken → start → send → handle → finish
│   │   ├── createScope.ts  state, concurrency, dispose
│   │   └── surface.ts      get/post/.../poll/remember/prefetch stubs on top of createScope
│   └── react/              imports core + react + @inertiajs/react
│       └── RouterScope.tsx
└── tests/
```

Consumed by the playground via `"@inertiajs-poc/scope": "workspace:*"`. No build step: Vite
compiles the TypeScript source directly (check in M00; if not, add an `esbuild` build like
`packages/react`).

### Key types (pure/types.ts)

```ts
type Method = 'get' | 'post' | 'put' | 'patch' | 'delete'
type Target = 'self' | 'parent' | 'root'

type ScopePage = {
  component: string
  props: Record<string, unknown> & { errors: Record<string, string> }
  url: string
  version: string | null
  rescuedProps: string[]                     // Deferred reads it (F15)
  deferredProps?: Record<string, string[]>
  flash?: Record<string, unknown>
}

// What callers pass. Same names as Inertia's VisitOptions; unknown keys are ignored (A2).
type VisitParams = {
  method?: Method; data?: Record<string, unknown>
  only?: string[]; except?: string[]; headers?: Record<string, string>
  onCancelToken?: (token: { cancel: () => void }) => void
  onBefore?: (visit: ScopeVisit) => boolean | void
  onStart?: (visit: ScopeVisit) => void
  onSuccess?: (page: ScopePage) => void | Promise<unknown>
  onError?: (errors: Record<string, string>) => void
  onCancel?: () => void
  onFinish?: (visit: ScopeVisit) => void
  [unknown: string]: unknown
}

// What callbacks and events receive (A3).
type ScopeVisit = {
  url: URL; method: Method; data: Record<string, unknown>
  only: string[]; except: string[]; headers: Record<string, string>
  preserveState: true; scope: { id: string; name: string }
}
```

### Scope API (core/createScope.ts + core/surface.ts)

```ts
type ScopeDeps = {
  transport: Transport
  root: RootAdapter
  getVersion: () => string | null
  parent?: Scope
}

type Scope = RouterSurfaceLike & {
  id: string; name: string
  status(): 'loading' | 'ready' | 'disposed'
  page: Store<ScopePage | null>
  ready(): Promise<ScopePage>
  applyPage(page: ScopePage): void          // for child scopes (T7)
  dispose(): void
}

createScope(options: { url?: string; page?: ScopePage; name?: string }, deps: ScopeDeps): Scope
```

`RouterSurfaceLike` mirrors `RouterSurface` structurally. In `RouterScope.tsx` the scope is
passed to `RouterProvider` with **one** documented cast (`as unknown as RouterSurface`);
the contract test in M08 is what really guarantees compatibility.

### React (react/RouterScope.tsx)

```tsx
<RouterScope url="/scopes/users" name="user-picker" fallback={<Spinner />} onDispose={close} />
```

Creates the scope, waits for the first page, resolves the component with
`router.resolveComponent`, renders it inside `RouterProvider` + `PageProvider`.

## Part C — demo app (`playgrounds/react/`)

```
app/Support/InertiaScope/
├── ScopeHeaders.php
├── ResolveInertiaScope.php            middleware (S1–S3)
└── InertiaScopeServiceProvider.php    macros (S4–S5)
routes/web.php                         a /scopes route group
app/Http/Controllers/Scopes/           UsersController, TodosController, WidgetController
resources/js/Pages/Scopes/             Index (the page with the modals), Users, TodoCreate, Widget
tests/Feature/InertiaScope/
```
