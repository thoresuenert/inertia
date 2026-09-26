// Runs one scope visit in the fixed order: build ScopeVisit (A3) →
// onBefore/before (Q4) → onCancelToken (A4) → onStart/start → send →
// handleResult → onFinish/finish (P1). Also defines the internal
// ScopeContext that createScope wires together.

import type { Emitter } from '../pure/emitter'
import { buildHeaders } from '../pure/headers'
import type { Store } from '../pure/store'
import type { ScopeEventDetailMap, ScopePage, ScopeVisit, VisitParams } from '../pure/types'
import { mergeQuery, toUrl } from '../pure/url'
import type { Concurrency } from './concurrency'
import { handleResult } from './handleResult'
import type { RootAdapter } from './rootAdapter'
import type { Transport } from './transport'

export type ScopeStatus = 'loading' | 'ready' | 'disposed'

export type ScopeContext = {
  id: string
  name: string
  transport: Transport
  root: RootAdapter
  getVersion: () => string | null
  parentUrl: () => string
  page: Store<ScopePage | null>
  emitter: Emitter<ScopeEventDetailMap>
  concurrency: Concurrency
  status: () => ScopeStatus
  setPage: (page: ScopePage) => void
  failInitial: (reason: string) => void
  dispose: () => void
  parentApply?: (page: ScopePage) => void
  selfReload: (only: string[]) => void
}

export async function runVisit(ctx: ScopeContext, url: string, params: VisitParams): Promise<void> {
  // C2: while a non-GET is in flight, new visits run no callbacks at all.
  if (ctx.concurrency.blocked()) {
    console.warn(`scope "${ctx.name}": visit ignored, a non-GET request is in flight`)
    return
  }

  const visit = buildVisit(ctx, url, params)

  // Q4: either may cancel; nothing was sent, so no further callbacks (and no
  // finish — P1 only counts visits that started).
  if (params.onBefore?.(visit) === false) {
    return
  }
  if (!ctx.emitter.emit('before', { visit })) {
    return
  }

  const controller = ctx.concurrency.begin(visit.method) // C1/C3 abort happens here
  if (!controller) {
    return // C2 reentrant edge (a before listener started a non-GET)
  }
  params.onCancelToken?.({ cancel: () => controller.abort() }) // A4: before onStart

  params.onStart?.(visit)
  ctx.emitter.emit('start', { visit })

  let suppressed = false
  try {
    let result = await ctx.transport.send({
      method: visit.method,
      url: visit.url.href,
      data: visit.method === 'get' ? undefined : visit.data,
      headers: visit.headers,
      signal: controller.signal,
    })
    // Free the slot before handleResult: a dispose triggered by THIS visit
    // (T6/T7) must not abort its own already-completed request.
    ctx.concurrency.finish(controller)
    if (ctx.status() === 'disposed') {
      suppressed = true // L3: dispose-aborted visits are fully silent
      return
    }
    if (controller.signal.aborted && result.kind === 'page') {
      result = { kind: 'aborted' } // C4: a response that raced the abort is never applied
    }
    await handleResult(ctx, visit, params, result)
  } finally {
    if (!suppressed) {
      // P1: exactly once for every visit that started. Same object as start (A3).
      params.onFinish?.(visit)
      ctx.emitter.emit('finish', { visit })
    }
  }
}

function buildVisit(ctx: ScopeContext, url: string, params: VisitParams): ScopeVisit {
  const method = params.method ?? 'get'
  const data = params.data ?? {}
  const currentPage = ctx.page.get()

  // U1: resolve against the scope page URL; the root URL only donates the
  // origin (server page URLs are host-relative, e.g. "/scopes/users").
  const base = toUrl(currentPage?.url ?? url, ctx.root.currentUrl()).href
  const resolved = method === 'get' ? toUrl(mergeQuery(url, data, base), base) : toUrl(url, base)

  const only = params.only ?? []
  const except = params.except ?? []

  const headers = buildHeaders({
    version: ctx.getVersion(), // Q3: read when the request is sent
    scopeName: ctx.name,
    scopeUrl: currentPage?.url ?? url, // initial load: the requested URL
    parentUrl: ctx.parentUrl(),
    // Q2: partials are validated against the current scope component; the
    // initial load has none, so partial headers are ignored there.
    partial: currentPage ? { component: currentPage.component, only, except } : undefined,
    extra: params.headers,
  })

  return {
    url: resolved,
    method,
    data: method === 'get' ? {} : data, // GET data was merged into the query (F16)
    only,
    except,
    headers,
    preserveState: true,
    scope: { id: ctx.id, name: ctx.name },
  }
}
