# Router Scopes — Proof of Concept Kit (fork edition)

Everything needed to build a proof of concept of **Router Scopes**
(`docs/00-rfc-inertia-router-scopes.md`) with Claude Code, in a fork of `inertiajs/inertia`.

A *scope* is a small, isolated Inertia page inside another page (modal, slideover, widget).
The goal of this PoC: **Inertia's own `Link`, `Form`, `useForm`, `usePage`, `Deferred`,
`WhenVisible`, `usePoll` work inside a scope without changes to application code.**

## The three parts

| Part | Where (in the fork) | What | Upstream? |
|---|---|---|---|
| **A. Adapter change** | `packages/react/src/` | Components get the router from React context instead of importing it. ~100 lines diff. | Yes — this is RFC step 1 |
| **B. Scope library** | `packages/scope/` (new, private) | The scope router: requests, targets, lifecycle. Plus `<RouterScope>`. | No, prototype only |
| **C. Demo app** | `playgrounds/react/` | Laravel 13 app, already linked to the local packages. Middleware + demo pages. | No |

`playgrounds/react` is the "fresh Laravel app": the Inertia repo already ships it, wired via
pnpm workspaces. That guarantees **one copy of `@inertiajs/core`** (the router is a singleton;
two copies = two routers = very confusing bugs). See `docs/06-decisions.md` D-10 for the
alternative with a separate app.

## How to use this kit

1. Fork `inertiajs/inertia` on GitHub, clone it, create branch `poc/router-scopes`.
2. Copy this `poc/` folder into the repo root, and `CLAUDE.md` to the repo root.
3. Work through `tasks/` **in order**, one Claude Code session per milestone, using
   `prompts.md`. After each: read the code, run the tests, commit.

## Reading order for humans

| File | What it gives you | Time |
|---|---|---|
| `docs/01-concept.md` | Mental model, vocabulary, flows | 5 min |
| `docs/02-architecture.md` | The three parts, files, APIs | 10 min |
| `docs/03-rules.md` | Every behaviour, numbered — tests refer to the IDs | 15 min |
| `docs/04-protocol.md` | Headers and the Laravel side | 5 min |
| `docs/05-inertia-v3-facts.md` | What we rely on in Inertia 3.7 (and must verify) | 5 min |
| `docs/06-decisions.md` | Deliberate simplifications | 5 min |
| `tasks/README.md` | 13 milestones with budgets | — |
| `qa/manual-test-plan.md` | Click-through test | — |

## Size budget

Part A ~100 lines diff · Part B ~700 lines code + ~700 tests · Part C ~300 lines.
If a milestone grows far beyond its budget, stop and simplify first.
