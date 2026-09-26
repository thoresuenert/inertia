// A scope: an isolated page store + emitter + visit methods on top of the
// injected transport/root deps (L1, L2). M06 subset — visit/reload/on/
// applyPage; concurrency and dispose arrive in M07, the full surface in M08.

import { applyPage as applyIncoming } from '../pure/applyPage'
import { createEmitter } from '../pure/emitter'
import { createStore, type Store } from '../pure/store'
import type { ScopeEventDetail, ScopeEventDetailMap, ScopeEventName, ScopePage, VisitParams } from '../pure/types'
import { runVisit, type ScopeContext, type ScopeStatus } from './runVisit'
import type { RootAdapter } from './rootAdapter'
import type { Transport } from './transport'

export type ScopeDeps = {
  transport: Transport
  root: RootAdapter
  getVersion: () => string | null
  parent?: Scope
}

export type ScopeOptions = { url?: string; page?: ScopePage; name?: string }

export type Scope = {
  id: string
  name: string
  status(): ScopeStatus
  page: Store<ScopePage | null>
  ready(): Promise<ScopePage>
  visit(url: string, params?: VisitParams): void
  reload(params?: VisitParams): void
  on<N extends ScopeEventName>(name: N, listener: (event: { detail: ScopeEventDetail<N> }) => unknown): () => void
  applyPage(page: ScopePage): void
}

let scopeCount = 0

export function createScope(options: ScopeOptions, deps: ScopeDeps): Scope {
  if (!options.url === !options.page) {
    throw new Error('createScope: pass either `url` or `page`, not neither/both') // L1
  }

  const id = `scope-${++scopeCount}`
  const name = options.name ?? id
  const page = createStore<ScopePage | null>(null)
  const emitter = createEmitter<ScopeEventDetailMap>()

  let status: ScopeStatus = 'loading'
  let resolveReady: (first: ScopePage) => void
  let rejectReady: (reason: Error) => void
  const readyPromise = new Promise<ScopePage>((resolve, reject) => {
    resolveReady = resolve
    rejectReady = reject
  })
  readyPromise.catch(() => {}) // no unhandled rejection when nobody awaits ready()

  const setPage = (next: ScopePage) => {
    page.set(next)
    if (status === 'loading') {
      status = 'ready' // L2
      resolveReady(next)
    }
  }

  const ctx: ScopeContext = {
    id,
    name,
    transport: deps.transport,
    root: deps.root,
    getVersion: deps.getVersion,
    parentUrl: () => deps.parent?.page.get()?.url ?? deps.root.currentUrl(),
    page,
    emitter,
    status: () => status,
    setPage,
    failInitial: (reason) => {
      if (status === 'loading') {
        rejectReady(new Error(`scope "${name}": ${reason}`)) // L2
      }
    },
  }

  if (options.page) {
    setPage(options.page)
  } else if (options.url) {
    void runVisit(ctx, options.url, {})
  }

  return {
    id,
    name,
    page,
    status: () => status,
    ready: () => readyPromise,
    visit: (url, params = {}) => void runVisit(ctx, url, params),
    reload: (params = {}) => {
      const current = page.get()
      if (!current) {
        console.warn(`scope "${name}": reload() before the first page is a no-op`)
        return
      }
      void runVisit(ctx, current.url, { ...params, method: 'get' }) // C5
    },
    on: (event, listener) => emitter.on(event, listener),
    // For target routing (T7): applied like a fresh page, no success event
    // (there is no visit to report).
    applyPage: (incoming) => setPage(applyIncoming(null, incoming, { partial: false })),
  }
}
