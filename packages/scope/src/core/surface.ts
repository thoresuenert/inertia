// Completes a scope to the full RouterSurface (A1): verb methods (A6), poll
// (A7), remember/restore (A8), prefetch stubs (A9), __scope marker (R4).
// Mutates via Object.assign — the lifecycle child registry is keyed by object
// identity, so the surfaced scope must BE the wired scope.

import type { VisitParams } from '../pure/types'
import type { Scope } from './createScope'

// destroy is part of core's poll handle and usePoll calls it on unmount
// (M09 finding) — for a scope it is the same as stop.
export type PollHandle = { stop(): void; start(): void; destroy(): void }

export type ScopeRouter = Scope & {
  __scope: true
  get(url: string, data?: Record<string, unknown>, params?: VisitParams): void
  post(url: string, data?: Record<string, unknown>, params?: VisitParams): void
  put(url: string, data?: Record<string, unknown>, params?: VisitParams): void
  patch(url: string, data?: Record<string, unknown>, params?: VisitParams): void
  delete(url: string, params?: VisitParams): void
  poll(interval: number, params?: VisitParams, options?: { keepAlive?: boolean; autoStart?: boolean }): PollHandle
  remember(data: unknown, key?: string): void
  restore(key?: string): unknown
  prefetch(): void
  getCached(): null
  getPrefetching(): null
  flush(): void
}

export function withSurface(
  scope: Scope,
  hooks: { addCleanup(fn: () => void): void; remembered: Map<string, unknown> },
): ScopeRouter {
  const verb =
    (method: 'get' | 'post' | 'put' | 'patch') =>
    (url: string, data: Record<string, unknown> = {}, params: VisitParams = {}) =>
      scope.visit(url, { ...params, method, data })

  let prefetchWarned = false

  return Object.assign(scope, {
    __scope: true as const,

    // A6: data via the second argument; delete takes data via params.data (F17).
    get: verb('get'),
    post: verb('post'),
    put: verb('put'),
    patch: verb('patch'),
    delete: (url: string, params: VisitParams = {}) => scope.visit(url, { ...params, method: 'delete' }),

    // A7: reload(params) every `interval` ms; stopped on dispose (L3 step 2).
    // keepAlive is accepted and ignored in the PoC.
    poll(interval: number, params: VisitParams = {}, options: { keepAlive?: boolean; autoStart?: boolean } = {}) {
      let timer: ReturnType<typeof setInterval> | null = null
      const stop = () => {
        if (timer !== null) {
          clearInterval(timer)
          timer = null
        }
      }
      const start = () => {
        if (timer === null && scope.status() !== 'disposed') {
          timer = setInterval(() => scope.reload(params), interval)
        }
      }
      hooks.addCleanup(stop)
      if (options.autoStart !== false) {
        start()
      }
      return { stop, start, destroy: stop }
    },

    // A8: the per-scope map IS the namespace — no shared storage, keys stay raw.
    remember: (data: unknown, key = 'default') => {
      hooks.remembered.set(key, data)
    },
    restore: (key = 'default') => hooks.remembered.get(key),

    // A9: prefetching is out of scope (D-08); warn once so callers notice.
    prefetch: () => {
      if (!prefetchWarned) {
        console.warn(`scope "${scope.name}": prefetch() is a no-op inside a scope`)
        prefetchWarned = true
      }
    },
    getCached: () => null,
    getPrefetching: () => null,
    flush: () => {},
  })
}
