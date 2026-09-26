# Manual test plan (M12)

Browser with DevTools → Network. Tick each item; note surprises in `poc/findings.md`.

## The proof
- [ ] `Scopes/Users`, `Scopes/TodoCreate`, `Scopes/Widget` import nothing from `@inertiajs-poc/scope`.
- [ ] Each of these pages also works when opened directly as a normal page (`/scopes/users`).

## Open / close
- [ ] Opening a modal: fallback, then content. One request with `X-Inertia-Scope` headers.
- [ ] Closing during the initial load: request cancelled, no console errors.
- [ ] The URL bar never changes while working inside a modal.

## User picker (Link, router.get)
- [ ] Typing fast: earlier requests cancelled, only the latest result shown.
- [ ] Only `users` requested (`X-Inertia-Partial-Data`).
- [ ] Pagination via Inertia `<Link>` updates only the modal. Ctrl/Cmd-click opens a new tab.
- [ ] Nested modal (user detail) opens on top; closing the outer one closes both.

## Create todo (useForm / Form)
- [ ] Empty submit: errors in the modal, page behind unchanged.
- [ ] `processing` true while submitting; double-click → one POST.
- [ ] Valid submit: modal closes, the new todo is in the list behind, flash visible.

## Widget (Deferred, usePoll)
- [ ] Deferred fallback, then the value. (K5: while it reloads, `Deferred` shows its reloading state.)
- [ ] Poll requests every 5 s while open; they stop when the modal closes.

## Edge cases
- [ ] Change the asset version, then act in a modal → hard reload (P2).
- [ ] Throw a 500 in a modal controller → modal stays, `error` event, page behind unchanged.
- [ ] Navigate the page behind while a modal is open → modal closes (L5).
- [ ] StrictMode (dev): no extra requests beyond the expected one per open.
- [ ] Existing playground pages outside `/scopes` behave exactly as before (K1).
