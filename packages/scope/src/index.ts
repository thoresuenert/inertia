// Public exports of @inertiajs-poc/scope. Everything consumers may use is
// re-exported here; nothing else in src/ is public.
// SCOPE_POC is the M00 wiring check, removed once real demo pages exist.

export const SCOPE_POC = 'scope-poc' as const

export type {
  Method,
  ScopeEventDetail,
  ScopeEventName,
  ScopePage,
  ScopeVisit,
  Target,
  VisitParams,
} from './pure/types'
export { createScope, type Scope, type ScopeDeps, type ScopeOptions } from './core/createScope'
export { type PollHandle, type ScopeRouter } from './core/surface'
export { createRootAdapter, type LocationLike, type RootAdapter } from './core/rootAdapter'
export { type ScopeStatus } from './core/runVisit'
export {
  createTransport,
  type Transport,
  type TransportRequest,
  type TransportResult,
} from './core/transport'
export { applyPage } from './pure/applyPage'
export { createEmitter, type Emitter } from './pure/emitter'
export { createStore, type Store } from './pure/store'
export { buildHeaders } from './pure/headers'
export { resolveTarget } from './pure/resolveTarget'
export { mergeQuery, samePath, toUrl } from './pure/url'
