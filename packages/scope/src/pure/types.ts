// Shared types of the scope library (docs/02-architecture.md "Key types").
// Types only, no runtime code, no imports. Event detail shapes per A5;
// the `error` and `dispose` shapes were decided in the M01 plan.

export type Method = 'get' | 'post' | 'put' | 'patch' | 'delete'

export type Target = 'self' | 'parent' | 'root'

export type ScopePage = {
  component: string
  props: Record<string, unknown> & { errors: Record<string, string> }
  url: string
  version: string | null
  rescuedProps: string[] // Deferred reads it (F15)
  deferredProps?: Record<string, string[]>
  flash?: Record<string, unknown>
}

// What callers pass. Same names as Inertia's VisitOptions; unknown keys are ignored (A2).
export type VisitParams = {
  method?: Method
  data?: Record<string, unknown>
  only?: string[]
  except?: string[]
  headers?: Record<string, string>
  onCancelToken?: (token: { cancel: () => void }) => void
  onBefore?: (visit: ScopeVisit) => boolean | void
  onStart?: (visit: ScopeVisit) => void
  onSuccess?: (page: ScopePage) => void | Promise<unknown>
  onError?: (errors: Record<string, string>) => void
  onCancel?: () => void
  onFinish?: (visit: ScopeVisit) => void
  [unknown: string]: unknown
}

// What callbacks and events receive (A3). One object per visit, reused for
// start and finish so Deferred can track it in a Set.
export type ScopeVisit = {
  url: URL
  method: Method
  data: Record<string, unknown>
  only: string[]
  except: string[]
  headers: Record<string, string>
  preserveState: true
  scope: { id: string; name: string }
}

export type ScopeEventName = 'before' | 'start' | 'success' | 'error' | 'cancel' | 'finish' | 'dispose'

// A5: listeners receive { detail: ... } like Inertia's CustomEvents.
export type ScopeEventDetailMap = {
  before: { visit: ScopeVisit }
  start: { visit: ScopeVisit }
  success: { page: ScopePage; visit: ScopeVisit }
  error: { errors: Record<string, string>; visit: ScopeVisit }
  cancel: { visit: ScopeVisit }
  finish: { visit: ScopeVisit }
  dispose: Record<string, never>
}

export type ScopeEventDetail<E extends ScopeEventName> = ScopeEventDetailMap[E]
