# 01 — Concept

## In one sentence

A **scope** is a tiny Inertia page inside a bigger page, with its own props, its own requests
and its own lifetime — and Inertia's normal components work inside it.

## Why

Today a `<Link href="/users?page=2">` or `router.get(...)` inside a modal navigates the
**whole page** and closes the modal. Modal packages work around this by re-implementing
`reload`, `Deferred`, `WhenVisible` etc. We want to prove that one small change to the React
adapter — *get the router from context* — makes all of that unnecessary.

## Vocabulary

| Word | Meaning |
|---|---|
| **Root** | The normal Inertia page and the global `router` from `@inertiajs/core`. |
| **Scope** | An isolated page object + a scope router that only changes that page object. |
| **Parent** | What a scope was opened from: the root or another scope. |
| **Scope page** | A normal Inertia page object `{ component, props, url, version, ... }`. |
| **Target** | Where a response goes: `self` (the scope), `parent`, or `root`. |
| **Router surface** | The router methods the React adapter calls. A scope implements exactly these. |

## How the pieces fit

```
<RouterScope url="/scopes/users">            (Part B, react/)
   │ creates a scope router, provides it via
   ├─ <RouterProvider value={scope}>        (Part A: new export)
   └─ <PageProvider value={scope page}>     (Part A: new export)
        │
        └─ Users page component — ordinary Inertia code:
             usePage(), <Link>, useForm(), <Deferred>, usePoll()
             → all call useRouter() → get the scope, not the global router (Part A)
```

## Flow: search inside a modal

```
router.get('/scopes/users', { search: 'Mül' }, { only: ['users'] })   ← useRouter() inside the modal
   │  Inertia headers + X-Inertia-Scope headers
   ▼
Laravel controller (unchanged) → Inertia page JSON
   ▼
resolveTarget(): same path as scope URL → "self"
   ▼
applyPage(): merge props into the scope page → modal re-renders
(root page and URL bar untouched)
```

## Flow: form inside a modal

```
useForm().post('/scopes/todos')
  ├─ validation fails → back() → scope URL → "self" → errors in the modal
  └─ success → redirect to the page behind → "root" → root updated, scope disposed
```

## Not in the PoC

History/back-button integration, deep links to modals, prefetching, file uploads,
`InfiniteScroll`, Vue/Svelte. See `06-decisions.md`.
