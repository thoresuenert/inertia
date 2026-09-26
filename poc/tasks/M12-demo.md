# M12 — Demo pages, deferred props, QA (Part B + C)

## Part A — Deferred props in scopes (Part B)
Rules D1–D3 in `core/handleResult.ts` (or `core/loadDeferred.ts` if it grows). Tests D1–D3.

## Part B — Demo (`playgrounds/react`), all under `/scopes`
Controllers are **ordinary Inertia controllers** — no scope-specific code except where noted.

1. `GET /scopes` → `Scopes/Index`: todo list + buttons opening three modals
   (plain `<dialog>` or a minimal modal component; no UI library).
2. **User picker** — `GET /scopes/users` → `Scopes/Users`: search input
   (`useRouter().get(..., { only: ['users'] })`, debounced), paginated table with Inertia
   `<Link>` (paginator URLs), 15 per page, seed enough users.
3. **Create todo** — `GET /scopes/todos/create` → `Scopes/TodoCreate` with Inertia `<Form>`
   or `useForm`; `POST /scopes/todos` validates `name` (required, min 3), redirects to `/scopes`.
4. **Widget** — `GET /scopes/widget` → `Scopes/Widget`: a `Inertia::defer()` prop shown with
   `<Deferred>`, and `usePoll(5000, { only: ['time'] })`.
5. From the user picker, open a nested `RouterScope` (e.g. a user detail) to exercise T7.

The page components must not import anything from `@inertiajs-poc/scope` —
only `Scopes/Index` (which opens the modals) does. **That is the proof.**

## Part C — QA
Run `qa/manual-test-plan.md`. Record every surprise in `poc/findings.md`
(what happened, expected, rule ID if any, idea). This file feeds the next RFC revision.
