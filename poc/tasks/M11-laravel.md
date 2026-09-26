# M11 — Laravel middleware + macros (Part C)

## Read first
`docs/04-protocol.md`, rules S1–S5.

## Files (`playgrounds/react/`)
- `app/Support/InertiaScope/ScopeHeaders.php` — header name constants.
- `app/Support/InertiaScope/ResolveInertiaScope.php` — S1–S3.
- `app/Support/InertiaScope/InertiaScopeServiceProvider.php` — S4, S5 macros.
- Register provider + append middleware to the `web` group (`bootstrap/app.php` /
  `bootstrap/providers.php`). Tell the human the exact lines.

## Tests (`tests/Feature/InertiaScope/`), throwaway routes defined inside the tests
- S1 no header → nothing changes.
- S2 `back()` and a failing validation in a scoped POST redirect to `X-Inertia-Scope-Url`.
- S3 `withScopeTarget('self')` → header on the next scoped response, once.
- S4 invalid target throws. S5 with and without header.
