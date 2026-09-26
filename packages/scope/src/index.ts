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
export { mergeQuery, samePath, toUrl } from './pure/url'
