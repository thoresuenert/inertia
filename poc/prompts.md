# Prompts for Claude Code

Paste these as-is. Replace `MXX` with the milestone file name.

## 1. Start a milestone

```
Read CLAUDE.md and everything in poc/docs/, then poc/tasks/MXX-*.md.

Do not write code yet. Give me:
1. the files you will create or change, with a one-line purpose each
2. the functions/types per file with signatures
3. the rule IDs you will implement and the test names you plan
4. anything in the spec that is unclear or contradicts the code that already exists

Keep it short. Wait for my OK.
```

## 2. After approving the plan

```
OK, implement it. Pure functions first, then tests, then run the tests.
Stay inside the milestone. If you hit something the spec does not cover, stop and ask.
Finish with the summary described in CLAUDE.md.
```

## 3. Make me understand it (after each milestone)

```
Walk me through the code of this milestone as if I had to maintain it alone.
For each file: what problem it solves, the one or two lines that matter most, and one
thing that would break if I changed it carelessly. No more than ~15 lines per file.
```

## 4. Review / simplify

```
Review the code of this milestone against CLAUDE.md (size limits, layering, injected deps,
no speculative features) and poc/docs/03-rules.md.
List concrete problems only, most important first. Suggest the simplest fix for each.
Do not change code yet.
```

## 5. When a rule turns out to be wrong

```
Rule <ID> does not work because <observation>.
Propose a change to poc/docs/03-rules.md first (diff only), including which
tests must change. Do not touch code until I approve the rule change.
```

## 6. Start a fresh session mid-way

```
Read CLAUDE.md, poc/docs/*, poc/tasks/README.md and
`git log --oneline -15`. Tell me which milestone is done and what the next one is.
Do not write code.
```

## 7. Before the adapter change (M09)

```
Before touching packages/react: show me every place in packages/react/src that uses `router`
or `window.location`, grouped by file, with one line on what it does. Compare with F13–F16 in
poc/docs/05-inertia-v3-facts.md and tell me about any difference. No code changes.
```
