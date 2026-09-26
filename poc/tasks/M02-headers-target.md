# M02 — Headers + resolveTarget (Part B, pure)

## Read first
`docs/04-protocol.md`, rules Q1, Q2, T1–T4.

## Files
- `pure/headers.ts`
  ```ts
  buildHeaders(input: {
    version: string | null; scopeName: string; scopeUrl: string; parentUrl: string
    partial?: { component: string; only: string[]; except: string[] }
    extra?: Record<string, string>
  }): Record<string, string>
  ```
- `pure/resolveTarget.ts`
  ```ts
  resolveTarget(input: {
    serverTarget: string | null; incomingUrl: string; scopeUrl: string; parentUrl: string
  }): Target
  ```

## Tests
- Q1: all standard + scope headers; version omitted when null; `extra` wins.
- Q2: partial headers only when `partial` given and `only`/`except` non-empty.
- T1 (incl. unknown value ignored), T2, T3, T4.
