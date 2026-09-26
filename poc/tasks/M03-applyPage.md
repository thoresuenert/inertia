# M03 — applyPage (Part B, pure)

## Read first
Rule T5.

## File
`pure/applyPage.ts`:
`applyPage(current: ScopePage | null, incoming: ScopePage, opts: { partial: boolean }): ScopePage`
Returns a new object, never mutates inputs.

## Tests
- T5: partial + same component → merged; partial + other component → replace; not partial → replace.
- T5: `errors` from incoming, default `{}`; `rescuedProps` default `[]`.
- `current === null` → incoming with defaults. Inputs not mutated.
