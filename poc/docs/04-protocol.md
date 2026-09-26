# 04 — Protocol

## Request headers (built by `packages/scope/src/pure/headers.ts`)

Standard Inertia headers:

| Header | Value |
|---|---|
| `X-Requested-With` | `XMLHttpRequest` |
| `X-Inertia` | `true` |
| `X-Inertia-Version` | `getVersion()` (omit if null) |
| `Accept` | `text/html, application/xhtml+xml` |
| `X-Inertia-Partial-Component` | current scope component (only with `only`/`except`) |
| `X-Inertia-Partial-Data` | `only.join(',')` |
| `X-Inertia-Partial-Except` | `except.join(',')` |

Scope headers:

| Header | Value |
|---|---|
| `X-Inertia-Scope` | scope name (or id) |
| `X-Inertia-Scope-Url` | current scope page URL (initial load: the requested URL) |
| `X-Inertia-Scope-Parent-Url` | parent scope page URL, or `window.location.href` for root parents |

User-supplied `options.headers` are merged last.

## Response headers

| Header | Meaning |
|---|---|
| `X-Inertia: true` | Body is an Inertia page JSON |
| `X-Inertia-Location` (with 409) | Hard reload to this URL (version mismatch / external redirect) |
| `X-Inertia-Scope-Target` | Optional server decision: `self`, `parent`, `root` |

## Redirects — the important detail

The browser follows redirects **inside** the XHR automatically. The client only sees the
final response. Consequences:

1. Request headers (incl. scope headers) are sent again on the followed GET. Good.
2. Headers set on the redirect response itself are **lost**. That is why
   `withScopeTarget()` flashes to the session and the middleware adds the header to the
   *next* scoped response (rule S3).
3. The final page JSON contains `url`. That is what `resolveTarget()` compares.

## Controller examples

```php
// Nothing special: validation errors go back to the scope URL (S2),
// success redirects to the page behind → target "root" (T4/T6)
public function store(Request $request) {
    $request->validate(['name' => 'required|min:3']);
    Todo::create($request->only('name'));
    return redirect('/scopes')->with('success', 'Todo created');
}

// Stay in the modal and show the copy
return redirect("/scopes/todos/{$copy->id}")->withScopeTarget('self');

// Back to whatever opened the modal
return redirect()->toScopeParent();
```
