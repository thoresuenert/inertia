# Milestones

One milestone = one Claude Code session = one commit. In order.

Paths like `docs/03-rules.md` are relative to `poc/`. Code paths are relative to the repo root.

| # | Milestone | Part | Budget (code + tests) |
|---|---|---|---|
| M00 | Fork setup, scope package skeleton, verify facts | — | ~60 |
| M01 | Types + URL helpers | B pure | ~130 |
| M02 | Headers + resolveTarget | B pure | ~150 |
| M03 | applyPage | B pure | ~120 |
| M04 | Emitter + store | B pure | ~130 |
| M05 | Transport + root adapter | B core | ~220 |
| M06 | Scope part 1: load, visit lifecycle, apply to self | B core | ~280 |
| M07 | Scope part 2: concurrency, targets, dispose | B core | ~280 |
| M08 | Router surface: signatures, poll, remember, stubs + contract test | B core | ~200 |
| M09 | Adapter change: router from context | A | ~100 diff |
| M10 | `<RouterScope>` | B react | ~180 |
| M11 | Laravel middleware + macros | C | ~180 |
| M12 | Demo pages, deferred props, QA | B + C | ~300 |

Order rationale: B (pure → core) is testable without a browser and without the fork change.
A comes when there is something to plug in. C last, when everything can be clicked through.

After each milestone the human checks:
- [ ] I can explain every new file in two sentences.
- [ ] Tests pass; test names map to rule IDs.
- [ ] No file > ~150 lines, no function > ~30 lines.
- [ ] Nothing outside the milestone was built.
- [ ] (M09 only) `git diff main -- packages/react` is small and boring.
