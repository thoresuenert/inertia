# Findings (M12 QA + earlier milestones)

Surprises and lessons collected while building and QA-ing the PoC. Feeds the
next RFC revision. QA was executed headlessly (Playwright, 34 checks, all
passing) — items that need eyes or real hardware are listed at the end.

## F-01 `redirect()->with()` never reaches `page.flash` (QA, todo submit)

**Happened:** valid todo submit closed the modal and updated the list, but no
flash appeared. **Expected:** "Todo created" on the page behind. **Cause:**
Inertia v3 has first-class flash (`Inertia::flash()` → `page.flash`);
Laravel's `->with()` is plain session flash and is never serialized into the
page object. **Idea for RFC:** §5.3's "errors and flash data are always
included" must say *Inertia* flash; scope demos/controllers should use
`Inertia::flash()`.

## F-02 `router.replace` does not fire `navigate` (M00, F9)

Only `push` fires it (`page.set` fires only `if (!replace)`). L5's
"dispose on root navigation" therefore misses root replace-visits to a
different pathname. Harmless here (T6 replace implies same URL), but the RFC's
event design should state which client-side visits emit `navigate`.

## F-03 Core's poll handle is `{ stop, start, destroy }` (M09)

`usePoll` calls `destroy()` on unmount. A7 / RFC §4.2 list only
`{ stop, start }` — any scope implementation must ship `destroy` or break
`usePoll`. Also: `usePoll` may pass `requestOptions` as a *function*; the
scope degrades that to `reload({})` (known gap, demo unaffected).

## F-04 A native `showModal()` dialog makes L5 nearly unreachable

The page behind a modal `<dialog>` cannot be clicked, so "root navigates
while a modal is open" only happens programmatically (back button, timers,
redirects). L5 is still right (unit-tested), but the RFC should note that its
primary trigger is history/programmatic navigation, not user clicks.

## F-05 Nav prefetch links pollute network assertions

The playground layout's `prefetch`/`prefetch="mount"` links fire root
`X-Inertia` requests on every page mount. Scoped and root traffic interleave
without interference (good sign for the design), but QA network assertions
must filter by `X-Inertia-Scope`, not `X-Inertia`.

## F-06 D3 does NOT work against real Laravel — partial responses drop `deferredProps` (CONFIRMED)

Verified in the browser (stats fetch artificially delayed past the 5s poll):
the initial full response carries `deferredProps: {"default":["stats"]}`, but
the poll's partial response (`only=time`) has **no `deferredProps` key**. Our
`applyPage` takes non-props fields from the incoming page, so the merged page
loses the map, D1 finds nothing, the aborted stats fetch is never retried and
the fallback shows forever. **Happened:** 1 stats request, UI stuck.
**Expected (D3):** 2 stats requests, stats visible. **Impact:** only bites
when a scope visit interrupts a slow deferred load — the demo's fast fetch
completes before the first poll, so it normally works. **Idea:** amend T5 so
a partial merge *keeps* `current.deferredProps` when the incoming page has
none (mirror of the props merge); alternatively the RFC should require server
adapters to always include `deferredProps`.

**Resolved:** T5 amended in `03-rules.md` (rule change first), `applyPage`
keeps `current.deferredProps` in the merge case when incoming has none.
Re-verified in the browser: the aborted stats fetch is retried right after
the poll's partial response applies, stats render (2 requests, UI resolves).
For the RFC: this retention rule belongs in the default response-application
semantics, not just in adapters.

## F-07 Nested scopes need a component, so "only Index imports the package" bent

Task M12 wanted a nested RouterScope from the picker AND only `Scopes/Index`
importing `@inertiajs-poc/scope`. Resolution (approved): one shared
`Components/ScopeModal.tsx` is the single importer; pages — including Index —
contain no scope primitives. This mirrors RFC §7.4 (packages own RouterScope)
and is arguably the stronger proof.

## F-08 Default layouts stay out of scopes for free

The playground sets a global default layout (`createInertiaApp({ layout })`).
Scope-rendered components never showed the app nav — layout wrapping happens
in `App`, not in `router.resolveComponent()`. Matches RFC §4.8
(`layouts: false` default) with zero code. Fragile though: if an adapter ever
moves layout attachment into `resolveComponent`, scopes would inherit it.

## F-09 T6 root apply preserves flash and props end-to-end (validates D-03)

`root.replace(page)` with the incoming page (client-side visit, no extra
request) delivered new props AND flash to the page behind. The D-03 gap
(merge/once props not handled) never surfaced in the demo.

## Needs a human pass

- Ctrl/Cmd-click on a pagination link inside a modal → opens a new tab.
- Real asset-version change (QA simulated the 409 + `X-Inertia-Location`).
- `<Deferred>` "reloading" slot state during a scope reload (K5) — visually.
- StrictMode: the playground app does not enable it; L6 is unit-test-covered
  only (`tests/react/RouterScope.test.tsx`).
