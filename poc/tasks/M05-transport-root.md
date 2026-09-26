# M05 — Transport + root adapter (Part B, core)

## Read first
F1–F9, rules P2–P6, U2.

## Files
- `core/transport.ts`
  ```ts
  type TransportRequest = { method: Method; url: string; data?: Record<string, unknown>;
                            headers: Record<string, string>; signal: AbortSignal }
  type TransportResult =
    | { kind: 'page'; page: ScopePage; serverTarget: string | null }
    | { kind: 'location'; url: string } | { kind: 'invalid' }
    | { kind: 'http'; status: number } | { kind: 'network' } | { kind: 'aborted' }
  type Transport = { send(req: TransportRequest): Promise<TransportResult> }
  createTransport(client?: HttpClient): Transport   // default: http.getClient()
  ```
  Never throws. GET: no body (URL already merged by the caller). Non-GET: JSON body +
  `Content-Type: application/json`. Classify per the P table.
- `core/rootAdapter.ts`
  ```ts
  type RootAdapter = {
    currentUrl(): string; push(page: ScopePage): void; replace(page: ScopePage): void
    reload(only: string[]): void; onNavigate(cb: (url: string) => void): () => void
    hardVisit(url: string): void
  }
  createRootAdapter(r?: typeof router): RootAdapter
  ```

## Tests
Reusable fakes in `packages/scope/tests/fakes.ts`: `fakeClient(responses)`, `fakeRoot()`,
`pageResponse(page, headers?)`, `deferredTransport()` (promises resolved manually — used in M07).
- One test per P row, plus "page".
- Non-GET JSON body + content type; GET no body.
- rootAdapter: push/replace pass page fields + `preserveScroll/preserveState: true` (fake router).
