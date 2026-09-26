# RFC: Router Scopes — isolated, disposable Inertia contexts for modals, slideovers and embedded views

- **Status:** Draft, revision 2 (validated by a working PoC)
- **Target:** `@inertiajs/core`, `@inertiajs/react`, `@inertiajs/vue3`, `@inertiajs/svelte`, `inertiajs/inertia-laravel`
- **Based on:** Inertia v3.7.x
- **Breaking changes:** None (fully opt-in)

> **Revision 2 (2026-09-26).** Amended after a proof of concept built rollout step 1
> (adapter: router from context) plus a standalone scope library and Laravel middleware
> against this fork (branch `poc/router-scopes`). Evidence: a ~70-line `packages/react`
> diff with the full Playwright suite unchanged (1201 passed), 105 unit tests over the
> scope library, 9 Laravel feature tests, and an automated pass over the manual QA plan
> (34 checks + 4 browser-driven edge cases). Amendments are marked **[PoC]** and sourced
> from `poc/findings.md`.

---

## 1. Summary

This RFC proposes **Router Scopes**: a way to create additional, isolated router instances that own their own page state, requests, event listeners, polls, remembered state and prefetch entries — and that can be mounted into any part of the component tree and torn down with a single call.

Inside a scope, all existing Inertia primitives (`Link`, `Form`, `useForm`, `usePage`, `Deferred`, `WhenVisible`, `InfiniteScroll`, `usePoll`, `usePrefetch`, `useRemember`, `router.*`) work exactly as they do on a page, but they operate on the scope instead of the root page.

```tsx
<RouterScope url="/mandanten/picker">
  {/* Everything in here is a small, self-contained Inertia app */}
</RouterScope>
```

The primary motivation is modals and slideovers, but the same primitive covers dashboard widgets, split views, embedded sub-pages, wizards and preview panes.

---

## 2. Motivation

### 2.1 The problem

Inertia's mental model is "one page at a time". The moment an application needs a **second, independently navigable surface** on screen — a modal with a searchable table, a slideover with a form, a dashboard widget with pagination — developers leave the Inertia model behind:

- A plain `<Link href="?page=2">` inside a modal navigates the **root page** and closes the modal.
- `router.get(url, { search })` inside a modal replaces the whole page.
- `useForm().post()` inside a modal works only because packages rewrite redirects on the server.
- `Deferred`, `WhenVisible` and `usePoll` read from and reload the **root page**, not the modal.

Packages such as `inertiaui/modal` and `momentum-modal` solve this by re-implementing parts of Inertia: their own request logic, their own `reload()`, their own `Deferred` and `WhenVisible`, and server-side request dispatching. This duplication is necessary today because Inertia offers no way to point its primitives at anything other than the root page.

### 2.2 Why it cannot be solved in userland today

In Inertia v3.7.x, the relevant state is module-level singletons:

| Concern | Location | Shape |
|---|---|---|
| Router | `core/src/index.ts` | `export const router = new Router()` |
| Current page | `core/src/page.ts` | `export const page = new CurrentPage()` |
| History | `core/src/history.ts` | `export const history = new History()` |
| Polls | `core/src/polls.ts` | `export const polls = new Polls()` |
| Prefetch cache | `core/src/prefetched.ts` | `export const prefetchedRequests = new PrefetchedRequests()` |
| Events | `core/src/events.ts` | `document.dispatchEvent(new CustomEvent('inertia:…'))` |

On the adapter side, `Link`, `useForm`, `Form`, `useRemember`, `Deferred` and `WhenVisible` import `router` directly from `@inertiajs/core`. `PageContext` is not part of the public API.

Consequences:

1. **No injection point.** A component cannot be told "use this router instead".
2. **No origin on events.** A global `before` listener cannot tell whether a visit came from a modal or the page, so interception is heuristic.
3. **No scoped teardown.** `router.cancelAll()` and polls are global; there is no way to cancel "everything the modal started" when it closes.
4. **No response routing.** A response always replaces the root page. The internal `interceptors.onVisitResponse` can transform a response but not redirect it to another target, and it is explicitly undocumented.
5. **Wrong `back()` on the server.** Requests from a modal carry the root page URL as `Referer`, so `redirect()->back()` resolves to the page, not the modal.

### 2.3 Goals

- Let any subtree run with its own router and page state.
- Make every existing Inertia primitive scope-aware **without new APIs for application code**.
- Provide deterministic teardown: closing a modal cancels its requests, stops its polls and removes its listeners.
- Let a scope decide where a response goes (itself, its parent, the root).
- Give server adapters enough information to handle redirects, errors and shared props correctly.
- Stay 100% backwards compatible: without scopes, nothing changes.

### 2.4 Non-goals

- Shipping a modal or slideover UI component in core. Scopes are the primitive; UI stays in packages.
- Deep-linkable modals ("open `/users/5/edit` directly and show the index page behind it"). This needs routing decisions that belong in packages. Scopes make it easier (see §6.9) but core does not prescribe it.
- SSR of scopes in the first iteration.

---

## 3. Terminology

- **Root router** — the existing `router` export. Owns `window.history` and the root page.
- **Scope** — a router instance created via `router.createScope()`. Owns its own page store.
- **Parent** — the router a scope was created from (root or another scope).
- **Scope page** — a standard Inertia page object (`component`, `props`, `url`, `version`, …) owned by a scope.
- **Response target** — where a response is applied: `self`, `parent`, `root` or `none`.

---

## 4. Detailed design — Core

### 4.1 `router.createScope()`

```ts
interface RouterScopeOptions {
  /** Initial page object. Either `page` or `url` must be given. */
  page?: Page
  /** URL to load the initial page from (GET). */
  url?: string

  /** Human-readable name. Used for remember namespaces, error bags, devtools and the protocol header. */
  name?: string

  /** Whether visits in this scope may touch window.history. Default: 'none'. */
  history?: 'none' | 'parent'

  /** Show the global progress bar for visits in this scope. Default: false. */
  progress?: boolean

  /** Resolve layouts for scope components. Default: false. */
  layouts?: boolean

  /** How <Head> behaves inside the scope. Default: 'ignore'. */
  head?: 'ignore' | 'stack'

  /** Share the parent's prefetch cache. Default: false. */
  sharePrefetchCache?: boolean

  /** Whether lifecycle events bubble to the parent (see §4.4). Default: true. */
  bubbleEvents?: boolean

  /** Decides where a response is applied (see §4.5). */
  resolveTarget?: ScopeTargetResolver
}

interface Router {
  createScope(options: RouterScopeOptions): RouterScope
}
```

`createScope` is available on the root router **and** on scopes, so scopes can nest.

### 4.2 The `RouterScope` object

A scope implements the full public `Router` interface, so any code that accepts a router accepts a scope:

```ts
interface RouterScope extends Router {
  readonly id: string
  readonly name: string | null
  readonly parent: Router
  readonly root: Router
  readonly disposed: boolean

  /** Reactive page store for this scope. */
  readonly page: {
    get(): Page
    subscribe(listener: (page: Page) => void): () => void
  }

  /** Resolves once the initial page (from `url`) is loaded. */
  ready(): Promise<Page>

  /** Cancel requests, stop polls, remove listeners, clear owned state. Idempotent. */
  dispose(options?: { cascade?: boolean }): void

  /** Register cleanup that runs on dispose. */
  onDispose(callback: () => void): () => void
}
```

All familiar methods keep their signatures and semantics, applied to the scope:

| Method | Behaviour in a scope |
|---|---|
| `visit`, `get`, `post`, `put`, `patch`, `delete` | Request is sent with scope headers (§5); the response is routed by `resolveTarget`. |
| `reload({ only, except, data })` | Partial reload against the **scope page URL** and component. |
| `prefetch`, `getCached`, `flush*` | Operate on the scope's cache (or the parent's if `sharePrefetchCache`). |
| `poll` | Registered in the scope's poll set; stopped on dispose. **[PoC]** The returned handle must be the full `{ stop, start, destroy }` — `usePoll` calls `destroy()` on unmount, so `destroy` is part of the contract. `requestOptions` may be a function (core accepts one); scope implementations must too. |
| `remember`, `restore` | Namespaced by scope name/id (§4.7). |
| `push`, `replace`, `replaceProp`, `appendToProp` | Client-side updates of the scope page. Touch `window.history` only if `history: 'parent'`. |
| `cancelAll` | Cancels only the scope's requests. |
| `on` | Listens to events of this scope (and its children if they bubble). |

### 4.3 Moving state from modules into instances

Internally, the singletons listed in §2.2 become **instance-owned**:

```ts
class Router {
  protected pageStore: CurrentPage
  protected historyAdapter: HistoryAdapter        // real History for root, NoopHistory/ParentHistory for scopes
  protected polls: Polls
  protected prefetched: PrefetchedRequests
  protected syncRequestStream: RequestStream
  protected asyncRequestStream: RequestStream
  protected emitter: EventEmitter
}

export const router = new Router({ root: true })
```

The existing module exports (`page`, `history`, …) remain as aliases to the root router's instances for backwards compatibility and are marked `@internal`.

### 4.4 Events

Each router gets its own emitter. The root emitter keeps dispatching `inertia:*` DOM events as today.

**Visit metadata.** Every visit gets a `scope` field:

```ts
type Visit = {
  // …existing fields
  scope: { id: string; name: string | null } | null   // null = root
}
```

**Bubbling.** Lifecycle events of a scope (`before`, `start`, `progress`, `finish`, `cancel`, `success`, `error`, `httpException`, `networkError`) **bubble to the parent** unless `bubbleEvents: false`. Page-state events (`navigate`, `beforeUpdate`) do **not** bubble, because they describe a change of *that* scope's page, not the parent's.

This keeps existing global listeners (analytics, custom progress bars) informed, while listeners that close modals on `navigate` are no longer triggered by visits inside a modal.

```ts
router.on('start', (event) => {
  if (event.detail.visit.scope) return // ignore modal/widget traffic
  analytics.track('page_visit', event.detail.visit.url.href)
})
```

`before` remains cancelable at every level; a parent listener returning `false` cancels a child's visit.

**Client-side visits and `navigate`. [PoC]** In v3.7.x, `router.push()` fires `navigate`
but `router.replace()` does not (`page.set` fires it only for non-replace updates).
Anything that reacts to "the root navigated" — closing scopes, analytics, scroll
restoration — must not assume every client-side visit emits `navigate`. This revision
proposes that `replace` also fire `navigate` (with `replace: true` in the detail); until
then the asymmetry must be documented wherever scope auto-disposal is specified.

### 4.5 Response routing

After a response is received, the scope asks its resolver where to apply it:

```ts
type ScopeTarget = 'self' | 'parent' | 'root' | 'none'

type ScopeTargetResolver = (context: {
  scope: RouterScope
  visit: Visit
  page: Page                 // the incoming page object
  redirected: boolean        // the request was redirected
  serverTarget: ScopeTarget | null // from the X-Inertia-Scope-Target response header
}) => ScopeTarget | { target: ScopeTarget; dispose?: boolean }
```

**Default resolver:**

1. If the server sent `X-Inertia-Scope-Target`, use it.
2. If the response URL has the same path as the scope URL → `self`.
3. If the response URL has the same path as the parent URL → `parent` (the parent reloads with the incoming page) and the scope is disposed.
4. Otherwise → `root` (a normal root navigation) and the scope is disposed.

This yields the behaviour developers expect without configuration:

- Search, filter, sort, pagination on the same URL → stays in the scope.
- Validation error → redirect back to the scope URL → stays in the scope, `errors` populated.
- Successful submit → redirect to the page behind → scope closes, page updates.
- Link to somewhere else → normal navigation, scope closes.

When the target is `parent` or `root`, the incoming page is applied there **without an additional request**, exactly as a normal Inertia response would be.

**Partial responses and `deferredProps`. [PoC]** Laravel's partial responses omit the
`deferredProps` map. When a partial response for the same component is merged into a
scope page, the current page's `deferredProps` **must be retained** if the incoming page
carries none — otherwise a deferred load aborted by a competing visit (a search, a poll)
is never retried and its fallback shows forever. This retention belongs to the core
response-application semantics, not to server adapters: it was confirmed against
inertia-laravel (the aborted fetch hung until the rule was added, and retried correctly
after).

### 4.6 Lifecycle and teardown

`scope.dispose()`:

1. Fires a non-bubbling `dispose` event on the scope.
2. Cancels all in-flight sync and async requests of the scope (fires `cancel`).
3. Stops all polls registered in the scope.
4. Removes all listeners registered via `scope.on()`.
5. Clears remembered state under the scope namespace (unless `history: 'parent'`, see §4.7).
6. Drops prefetch entries owned by the scope.
7. Runs `onDispose` callbacks.
8. Disposes child scopes (`cascade` defaults to `true`).

After dispose, calling any visit method is a no-op and logs a development warning.

### 4.7 Remember and history

- `useRemember` / `router.remember` inside a scope use the key `scope:<name|id>:<key>`.
- With `history: 'none'` (default), remembered state lives in memory and is dropped on dispose.
- With `history: 'parent'`, scope visits may call `push`/`replace` on the parent history, and remembered state is written into the history entry under `scopes[<name>]`. This enables packages to implement back-button-aware modals.

### 4.8 Head, layouts, progress

- `head: 'ignore'` (default): `<Head>` inside a scope renders nothing. `head: 'stack'`: the scope's title and meta override the parent while mounted and are restored on dispose.
- `layouts: false` (default): scope components are rendered without persistent layouts.
  **[PoC]** Today this holds only by accident: adapters attach default layouts during the
  root `App` render, not inside `resolveComponent`, so a scope rendering the resolved
  component directly skips them. The `layouts: false` guarantee must be owned by the
  scope renderer — if layout attachment ever moves into `resolveComponent`, scopes would
  silently inherit page layouts.
- `progress: false` (default): visits in the scope do not show the global progress bar. Adapters expose the scope's loading state (§6.4) for local indicators.

### 4.9 Asset version and errors

- A version mismatch (409) in a scope is always escalated to the **root** and triggers the usual full reload.
- `httpException` and `networkError` fire on the scope and bubble. The default handler (showing the error modal) runs only once, at the root.

---

## 5. Detailed design — Protocol

### 5.1 Request headers

Every scope request adds:

| Header | Value | Purpose |
|---|---|---|
| `X-Inertia-Scope` | scope name or id | Tells the server this is a scoped request. |
| `X-Inertia-Scope-Url` | current scope page URL | Used as "back" target instead of `Referer`. |
| `X-Inertia-Scope-Parent-Url` | parent page URL | Lets the server redirect to "the page behind". |

All existing Inertia headers (`X-Inertia`, `X-Inertia-Version`, `X-Inertia-Partial-Component`, `X-Inertia-Partial-Data`, `X-Inertia-Partial-Except`, …) are sent as usual. Partial reloads are validated against the **scope** component.

### 5.2 Response headers

| Header | Value | Purpose |
|---|---|---|
| `X-Inertia-Scope-Target` | `self` \| `parent` \| `root` \| `none` | Optional server hint for §4.5. |

### 5.3 Laravel adapter

**Request helpers**

```php
$request->inertiaScope();          // ?string  — scope name/id, null for root requests
$request->inertiaScopeUrl();       // ?string
$request->inertiaScopeParentUrl(); // ?string
```

**Redirects**

`redirect()->back()` and `back()` resolve to `X-Inertia-Scope-Url` for scoped requests. Two new helpers:

```php
return redirect()->toScopeParent();          // X-Inertia-Scope-Parent-Url, target=parent
return back()->withScopeTarget('root');      // explicit target hint
```

**Validation errors**

For scoped requests without an explicit error bag, the adapter uses the scope name as error bag, so a modal's errors never leak into the page behind it.

**Shared props**

`HandleInertiaRequests::share()` is evaluated for every Inertia request today. For scoped requests the middleware calls a new method instead:

```php
public function shareInScope(Request $request): array
{
    // Default: only what a scope typically needs.
    return [
        'auth.user' => fn () => $request->user()?->only('id', 'name'),
    ];
}
```

The default implementation returns `[]`; `errors` and flash data are always included.

**Two lessons from the PoC middleware. [PoC]**

- "Flash" here means Inertia's first-class flash (`Inertia::flash()` → `page.flash`).
  Laravel session flash via `redirect()->with()` never reaches the page object — all
  scope examples and adapter docs must use `Inertia::flash()`.
- `withScopeTarget()` flashes to the session precisely because headers on redirect
  responses are dropped by the browser. The middleware must therefore read that flash
  **before** handling the request (i.e. only a *previous* request's flash), and request
  attributes **after**. Reading the flash after `$next()` makes the redirecting response
  consume its own flash: the target header lands on the 302 and is lost.

---

## 6. Detailed design — Adapters

### 6.1 Router from context

All adapter primitives read the router from context instead of importing it:

```ts
// @inertiajs/react
export function useRouter(): Router       // nearest scope, falls back to the root router
export function usePage<T>(): Page<T>     // page of the nearest scope, falls back to the root page
```

Affected components and hooks: `Link`, `Form`, `useForm`, `useFormContext`, `Deferred`, `WhenVisible`, `WhenMounted`, `InfiniteScroll`, `usePoll`, `usePrefetch`, `useRemember`, `Head`.

Because the fallback is the root router, **existing applications behave identically**.

### 6.2 `<RouterScope>` component

```tsx
interface RouterScopeProps extends RouterScopeOptions {
  /** Use an existing scope instead of creating one. */
  router?: RouterScope
  /** Rendered while the initial page loads (when `url` is given). */
  fallback?: ReactNode
  /** Custom rendering of the resolved page component. */
  children?: ReactNode | ((ctx: { Component: ComponentType; page: Page; scope: RouterScope }) => ReactNode)
  onDispose?: () => void
}
```

- If `router` is not passed, the component creates a scope on mount and **disposes it on unmount**.
- If `children` is omitted, the resolved page component is rendered with the scope page props.
- **[PoC]** Under React `<StrictMode>` the create-in-effect lifecycle produces one extra,
  immediately-disposed scope per mount — one discarded request in development. That is
  the documented cost of effect-based creation; responses belonging to disposed scopes
  are never applied, even when the abort races a fast server response.
- **[PoC]** With a native `<dialog>` + `showModal()`, the page behind is inert — "the
  root navigates while a scope is open" can then only happen programmatically (back
  button, redirects, timers). Auto-disposal on root navigation is still required, but
  specs and tests must not assume user clicks as its trigger.

### 6.3 `useRouterScope()`

For packages that need the scope object before rendering:

```ts
const scope = useRouterScope({ url: '/mandanten/picker', name: 'picker' })
// created once, disposed automatically on unmount
```

### 6.4 `useScopeState()`

```ts
const { processing, progress, visit } = useScopeState()
```

Loading state of the nearest scope, for local spinners instead of the global progress bar.

### 6.5 Vue and Svelte

Same API via `provide`/`inject` (Vue) and `setContext`/`getContext` (Svelte): a `<RouterScope>` component plus `useRouter()`, `useRouterScope()` and `useScopeState()`.

---

## 7. Usage examples

### 7.1 Searchable, paginated table in a modal — with plain Inertia code

**Controller**

```php
public function picker(Request $request)
{
    return Inertia::render('Mandanten/Picker', [
        'filters'   => $request->only('search', 'status'),
        'mandanten' => fn () => Mandant::query()
            ->when($request->search, fn ($q, $s) => $q->where('name', 'like', "%{$s}%"))
            ->when($request->status, fn ($q, $s) => $q->where('status', $s))
            ->paginate(15)
            ->withQueryString(),
    ]);
}
```

No modal-specific code on the server.

**Opening the modal**

```tsx
import { RouterScope } from '@inertiajs/react'
import { Dialog, DialogContent } from '@/components/ui/dialog'

export function MandantPickerDialog({ open, onOpenChange }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        {open && <RouterScope url="/mandanten/picker" name="mandant-picker" fallback={<Spinner />} />}
      </DialogContent>
    </Dialog>
  )
}
```

**The page component — identical to a normal page**

```tsx
import { Link, router, usePage } from '@inertiajs/react'
import { useEffect, useState } from 'react'

export default function Picker({ mandanten, filters }) {
  const [search, setSearch] = useState(filters.search ?? '')

  useEffect(() => {
    const t = setTimeout(() => {
      router.get('/mandanten/picker', { search }, { only: ['mandanten'], preserveState: true, replace: true })
    }, 300)
    return () => clearTimeout(t)
  }, [search])

  return (
    <>
      <input value={search} onChange={(e) => setSearch(e.target.value)} />
      <Table rows={mandanten.data} />
      {mandanten.links.map((link) => (
        <Link key={link.label} href={link.url} only={['mandanten']} preserveState>
          {link.label}
        </Link>
      ))}
    </>
  )
}
```

> Note: the example uses the imported `router` for brevity. Inside a scope, application code should call `useRouter()` (§8.2). A development warning points out global `router` calls made from within a scope.

Closing the dialog unmounts `<RouterScope>`, which cancels a pending search request and removes all listeners.

### 7.2 Form in a slideover

**Controller**

```php
public function store(StoreBelegRequest $request)
{
    Beleg::create($request->validated());

    // Validation errors → back() → scope URL → stays in slideover with errors
    // Success → redirect to the page behind → slideover closes, page updates
    return redirect()->route('belege.index')->with('success', 'Beleg angelegt');
}
```

**Component**

```tsx
import { Form } from '@inertiajs/react'

export default function CreateBeleg() {
  return (
    <Form action="/belege" method="post">
      {({ errors, processing }) => (
        <>
          <input name="betrag" />
          {errors.betrag && <p>{errors.betrag}</p>}
          <button disabled={processing}>Speichern</button>
        </>
      )}
    </Form>
  )
}
```

```tsx
<Sheet open={open} onOpenChange={setOpen}>
  <SheetContent>
    {open && (
      <RouterScope
        url="/belege/create"
        name="beleg-create"
        onDispose={() => setOpen(false)}
      />
    )}
  </SheetContent>
</Sheet>
```

The default resolver (§4.5) routes the success redirect to `/belege` → `parent` target → the page behind receives the new page object, the scope disposes itself, `onDispose` closes the sheet. `errors` and `processing` in `<Form>` work unchanged because the visit's own callbacks are never bypassed.

### 7.3 Dashboard widgets with independent pagination and polling

```tsx
export default function Dashboard() {
  return (
    <div className="grid grid-cols-2 gap-4">
      <RouterScope url="/widgets/offene-belege" name="offene-belege" />
      <RouterScope url="/widgets/datev-status" name="datev-status" />
    </div>
  )
}
```

```tsx
// Widgets/DatevStatus.tsx
import { usePoll, Deferred } from '@inertiajs/react'

export default function DatevStatus({ status, jobs }) {
  usePoll(10_000, { only: ['status'] }) // polls only this widget, stops on unmount

  return (
    <Card>
      <StatusBadge status={status} />
      <Deferred data="jobs" fallback={<Skeleton />}>
        <JobList jobs={jobs} />
      </Deferred>
    </Card>
  )
}
```

Each widget has its own page state, deferred props, polling and pagination. Navigating away from the dashboard disposes all widget scopes.

### 7.4 Building a modal package on top of scopes

A minimal but complete modal stack in roughly fifty lines:

```tsx
import { RouterScope, useRouter } from '@inertiajs/react'
import { createContext, useContext, useState, type ReactNode } from 'react'

type Entry = { id: string; url: string; config: ModalConfig }
const ModalStackContext = createContext<{ open(url: string, config?: ModalConfig): void } | null>(null)

export function ModalStackProvider({ children }: { children: ReactNode }) {
  const [stack, setStack] = useState<Entry[]>([])

  const open = (url: string, config: ModalConfig = {}) =>
    setStack((s) => [...s, { id: crypto.randomUUID(), url, config }])

  const close = (id: string) => setStack((s) => s.filter((e) => e.id !== id))

  return (
    <ModalStackContext.Provider value={{ open }}>
      {children}
      {stack.map((entry, index) => (
        <ModalShell key={entry.id} depth={index} onClose={() => close(entry.id)} {...entry.config}>
          <RouterScope url={entry.url} name={`modal-${index}`} onDispose={() => close(entry.id)} />
        </ModalShell>
      ))}
    </ModalStackContext.Provider>
  )
}

export function ModalLink({ href, children, ...config }: { href: string; children: ReactNode } & ModalConfig) {
  const stack = useContext(ModalStackContext)!
  return (
    <a href={href} onClick={(e) => { e.preventDefault(); stack.open(href, config) }}>
      {children}
    </a>
  )
}
```

Compared to today's packages, this needs **no** custom `reload()`, `Deferred`, `WhenVisible`, request logic, header interceptors or server-side request dispatching.

### 7.5 Nested scopes (modal opened from a modal)

```tsx
// Inside Mandanten/Picker (already running in a scope)
<ModalLink href="/mandanten/create">Neuen Mandanten anlegen</ModalLink>
```

The inner scope's parent is the picker scope. After a successful create that redirects to `/mandanten/picker`, the default resolver applies the response to the **parent** (the picker), which now shows the new Mandant; the inner modal closes. Disposing the picker cascades to the inner modal.

### 7.6 Custom target resolution

```tsx
<RouterScope
  url="/belege/42"
  name="beleg-preview"
  resolveTarget={({ page, visit }) => {
    // Keep all GET navigation inside the preview pane, even to other Belege
    if (visit.method === 'get' && page.component.startsWith('Belege/')) return 'self'
    return 'root'
  }}
/>
```

Useful for master-detail layouts where the detail pane browses independently.

### 7.7 Server-side target hints

```php
public function destroy(Beleg $beleg)
{
    $beleg->delete();

    return redirect()->toScopeParent()->with('success', 'Beleg gelöscht');
}

public function duplicate(Request $request, Beleg $beleg)
{
    $copy = $beleg->replicate();
    $copy->save();

    // Stay in the modal and show the copy
    return redirect()->route('belege.show', $copy)->withScopeTarget('self');
}
```

### 7.8 Global listeners

```ts
// Custom top-level progress bar that ignores scoped traffic
router.on('start', ({ detail }) => { if (!detail.visit.scope) nprogress.start() })
router.on('finish', ({ detail }) => { if (!detail.visit.scope) nprogress.done() })

// Unsaved-changes guard that also protects open modals
router.on('before', ({ detail }) => {
  if (hasUnsavedChanges(detail.visit.scope?.name)) {
    return confirm('Ungespeicherte Änderungen verwerfen?')
  }
})
```

### 7.9 Deep-linkable modals (package territory)

With `history: 'parent'`, a package can keep the modal URL in the address bar:

```tsx
<RouterScope url="/belege/42/edit" name="beleg-edit" history="parent" />
```

Scope visits call `parent.replace({ url })` so the browser shows `/belege/42/edit`; the scope's remembered state is stored in that history entry. Deciding what to render when a user opens `/belege/42/edit` directly (the page behind + the modal) stays a package decision, typically via a small server helper that renders the base route and passes the modal URL as a prop.

### 7.10 Vue

```vue
<script setup lang="ts">
import { RouterScope } from '@inertiajs/vue3'
const open = defineModel<boolean>('open')
</script>

<template>
  <Dialog v-model:open="open">
    <DialogContent>
      <RouterScope v-if="open" url="/mandanten/picker" name="mandant-picker">
        <template #fallback><Spinner /></template>
      </RouterScope>
    </DialogContent>
  </Dialog>
</template>
```

### 7.11 Testing

```ts
import { router } from '@inertiajs/core'

test('search stays inside the scope', async () => {
  const scope = router.createScope({ url: '/mandanten/picker', name: 'test' })
  await scope.ready()

  scope.get('/mandanten/picker', { search: 'Müller' }, { only: ['mandanten'] })
  await waitFor(() => expect(scope.page.get().props.filters.search).toBe('Müller'))

  expect(router.page.get().url).toBe('/dashboard') // root untouched
  scope.dispose()
})
```

---

## 8. Backwards compatibility

### 8.1 No behaviour change without scopes

- `import { router } from '@inertiajs/core'` still returns the root router.
- `useRouter()` and `usePage()` fall back to the root when no scope is present.
- DOM events `inertia:*` are dispatched exactly as today for root visits.
- Visits get a new `scope: null` field; no field is removed or renamed.
- No new request headers are sent outside scopes.

### 8.2 Global `router` inside a scope

Existing code that calls the imported `router` from within a scope keeps targeting the root. This is intentional (explicit beats magic) but likely surprising, so:

- In development, the adapter warns when the root `router` is called from an effect or lifecycle hook of a component rendered inside a scope. Calls from plain event handlers cannot be attributed reliably, so they are covered by documentation only (see §13, question 8).
- Documentation recommends `const router = useRouter()` in components that may render inside scopes.

### 8.3 Existing modal packages

Packages can migrate incrementally: they can keep their current UI and replace their request/reload/`Deferred`/`WhenVisible` implementations with a `<RouterScope>`.

---

## 9. Rollout plan

The proposal splits into independent, individually useful steps:

1. **Adapters: router and page from context** (`useRouter`, context-aware `usePage`, all primitives use them). Default is the root router. Zero behaviour change, but already allows packages to inject a router-like object.
2. **Core: instance-owned state.** Move page store, history adapter, polls, prefetch cache, request streams and emitter into `Router` instances. Keep module exports as root aliases.
3. **Core: `createScope`, events with `visit.scope`, bubbling, `dispose`.**
4. **Core: response routing** (`resolveTarget`, default resolver).
5. **Protocol + Laravel adapter** (headers, `back()` resolution, `toScopeParent`, `shareInScope`, error bags).
6. **Adapters: `<RouterScope>`, `useRouterScope`, `useScopeState`**, Head/layout/progress options.
7. **Docs:** "Scopes" guide with modal, slideover and widget recipes.

Steps 1 and 2 are internal refactors with no public API change and can ship in a minor release.

**Step 1 is implemented and validated. [PoC]** On this fork, the React adapter change is
~70 lines (a `RouterContext` defaulting to the global router, `useRouter()`, seven
files switched, `Deferred` comparing against `usePage().url`), measured behaviour-neutral:
the full Playwright suite is identical to its pre-change baseline. With only step 1 and a
userland scope library, `Link`, `Form`/`useForm`, `usePage`, `Deferred`, `usePoll` and
`useRemember` all work unmodified inside scopes — a searchable paginated picker, a form
with validation errors, nested modals with parent-targeted responses, and a polling widget
with deferred props were demonstrated end-to-end. `InfiniteScroll` is the one primitive
that cannot be scoped from the adapter (core's implementation imports the router
directly) — concrete evidence that step 2 is required for full coverage, and for nothing
less than that.

---

## 10. Drawbacks

- **Core complexity.** Turning singletons into instances touches most of `core/src`. The history and prefetch code in particular need careful isolation.
- **Bundle size.** Estimated at a few kB for scope management and the null history adapter.
- **Two ways to get a router.** `import { router }` vs `useRouter()` needs clear documentation.
- **More server-adapter surface.** Every server adapter (Laravel, Rails, Django, Phoenix, …) needs to implement §5 to fully benefit, although scopes work without it (only `back()` and shared-prop optimisation are affected).
- **Mental model.** "Which page am I on?" becomes contextual.

---

## 11. Alternatives considered

**Status quo (packages fork primitives).** Works, but every package re-implements Inertia internals and breaks on minor releases. Application code inside modals cannot use normal `Link`/`router` for same-URL navigation.

**Public visit interceptors only.** Making `interceptors.onVisitRequest/onVisitResponse` public and allowing a response handler to "swallow" a response would let packages redirect responses. It does not solve `usePage`, `Deferred`, `WhenVisible`, polls, remember or teardown, so packages would still fork those.

**Intercepting `router.on('before')`.** Cancelling root visits and replaying them against a modal loses the visit's own callbacks (`onSuccess`, `onFinish`, `processing`), must heuristically detect the origin and still needs forked `Deferred`/`WhenVisible`.

**Multiple `createInertiaApp()` roots.** Each root would fight over `window.history`, the progress bar and global events, and share nothing with the host page.

**Iframes.** Full isolation, but poor UX (sizing, focus, styling, shared auth state) and double asset loading.

**HTML-fragment frames (Turbo Frames / htmx style).** Proven model, but it conflicts with Inertia's JSON-page protocol and client-side components. Router Scopes are effectively "Turbo Frames for Inertia" while staying within the existing protocol.

---

## 12. Prior art

- **inertiaui/modal** and **momentum-modal** — modal packages that load Inertia responses into a separate stack; their workarounds informed §2.2.
- **Hotwire Turbo Frames** — scoped navigation inside a page region, with `target="_top"` escaping to the full page (compare §4.5).
- **htmx `hx-target`** — per-element response targeting.
- **Livewire nested components** — independently updatable server-driven regions.

---

## 13. Unresolved questions

1. **Event bubbling defaults.** Should `before` bubble by default? It enables global guards (§7.8) but might surprise listeners that assume every `before` is a root navigation.
2. **Prefetch cache keys.** When `sharePrefetchCache` is true, a prefetched root response and a scope response for the same URL differ in shared props (`shareInScope`). Do cache keys need the scope?
3. **`InfiniteScroll` URL sync.** It currently updates the query string. Inside a `history: 'none'` scope this must be suppressed; with `history: 'parent'` it could update the parent URL. Is that desirable?
4. **Encrypted history and `clearHistory()`.** How do they interact with scope state stored in history entries?
5. **Optimistic updates.** Should `optimistic` callbacks be able to target the parent page (e.g. a list behind a modal)?
6. **Precognition.** Does live validation inside a scope need the scope headers? (Likely yes, for error bags.)
7. **SSR.** Is there a use case for server-rendering the initial page of a scope, or is client-side loading always acceptable?
8. **Development warning for global `router` calls** (§8.2): is there a reliable detection strategy across React, Vue and Svelte, or should this be documentation-only?

### 13.1 Settled by the PoC **[PoC]**

- **Question 6 (Precognition), partially:** the PoC left Precognition untouched and
  nothing broke, but live validation inside a scope was not exercised — still open.
- **Question 7 (SSR):** client-side loading of the initial scope page (`url` + fallback)
  was unobtrusive in practice (one request, spinner for one round-trip). No SSR need
  surfaced; keeping SSR out of the first iteration is confirmed as the right call.
- **New, answered:** the poll-handle shape (§4.2), the `navigate`/`replace` asymmetry
  (§4.4), `deferredProps` retention on partial merges (§4.5), Inertia-flash vs session
  flash and the flash-read ordering in server middleware (§5.3), the StrictMode cost and
  the `showModal()` interaction (§6.2), and the layout-attachment fragility (§4.8).
- The full evidence trail, including two bugs found and fixed during QA, lives in
  `poc/findings.md`; behaviour rules with per-rule tests live in `poc/docs/03-rules.md`.

---

## 14. Summary of new public API

**Core**

- `router.createScope(options): RouterScope`
- `RouterScope`: all `Router` methods + `id`, `name`, `parent`, `root`, `page`, `ready()`, `dispose()`, `onDispose()`, `disposed`
- `Visit.scope`
- Event `dispose` (scope-local)

**Adapters**

- `<RouterScope>`
- `useRouter()`
- `useRouterScope(options)`
- `useScopeState()`
- `usePage()` becomes scope-aware

**Protocol**

- Request: `X-Inertia-Scope`, `X-Inertia-Scope-Url`, `X-Inertia-Scope-Parent-Url`
- Response: `X-Inertia-Scope-Target`

**Laravel**

- `$request->inertiaScope()`, `inertiaScopeUrl()`, `inertiaScopeParentUrl()`
- `back()` resolves to the scope URL for scoped requests
- `redirect()->toScopeParent()`, `->withScopeTarget($target)`
- `HandleInertiaRequests::shareInScope()`
- Automatic error bag per scope
