// A scope: an isolated page store + emitter + visit methods on top of the
// injected transport/root deps (L1, L2), with deterministic teardown (L3–L5).
// Child scopes register with their parent for cascade dispose; the full
// router surface arrives in M08.

import { applyPage as applyIncoming } from '../pure/applyPage'
import { createEmitter } from '../pure/emitter'
import { createStore, type Store } from '../pure/store'
import type { ScopeEventDetail, ScopeEventDetailMap, ScopeEventName, ScopePage, VisitParams } from '../pure/types'
import { toUrl } from '../pure/url'
import { createConcurrency } from './concurrency'
import { createLifecycle } from './lifecycle'
import { runVisit, type ScopeContext, type ScopeStatus } from './runVisit'
import type { RootAdapter } from './rootAdapter'
import { withSurface, type ScopeRouter } from './surface'
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
  dispose(): void
}

let scopeCount = 0

export function createScope(options: ScopeOptions, deps: ScopeDeps): ScopeRouter {
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

  const concurrency = createConcurrency()
  const remembered = new Map<string, unknown>() // filled in M08 (A8), cleared on dispose

  const { dispose, cleanups, wire } = createLifecycle({
    isDisposed: () => status === 'disposed',
    markDisposed: () => {
      status = 'disposed'
      rejectReady(new Error(`scope "${name}": disposed`)) // L2 — no-op if already resolved
    },
    concurrency,
    emitter,
    remembered,
  })

  const ctx: ScopeContext = {
    id,
    name,
    transport: deps.transport,
    root: deps.root,
    getVersion: deps.getVersion,
    parentUrl: () => {
      const parentPageUrl = deps.parent?.page.get()?.url
      return parentPageUrl ? toUrl(parentPageUrl, deps.root.currentUrl()).href : deps.root.currentUrl()
    },
    page,
    emitter,
    concurrency,
    status: () => status,
    setPage,
    failInitial: (reason) => {
      if (status === 'loading') {
        rejectReady(new Error(`scope "${name}": ${reason}`)) // L2
      }
    },
    dispose,
    parentApply: deps.parent ? (incoming) => deps.parent!.applyPage(incoming) : undefined,
  }

  const guard = (action: string): boolean => {
    if (status === 'disposed') {
      console.warn(`scope "${name}": ${action}() after dispose is a no-op`) // L4
      return false
    }
    return true
  }

  const scope: Scope = {
    id,
    name,
    page,
    status: () => status,
    ready: () => readyPromise,
    visit: (url, params = {}) => {
      if (guard('visit')) {
        void runVisit(ctx, url, params)
      }
    },
    reload: (params = {}) => {
      if (!guard('reload')) {
        return
      }
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
    dispose,
  }

  // withSurface mutates `scope` (identity matters for the child registry).
  const surfaced = withSurface(scope, { addCleanup: (fn) => cleanups.push(fn), remembered })
  wire(surfaced, deps.parent, deps.root)

  if (options.page) {
    setPage(options.page)
  } else if (options.url) {
    void runVisit(ctx, options.url, {})
  }

  return surfaced
}
