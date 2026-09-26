// Applies a transport result to the scope. Pages are routed by resolveTarget
// (T1–T4): self (T5, T8), a parent scope (T7) or the root (T6 — also for
// `parent` when the parent IS the root). Transport failures emit `error` with
// empty errors (P3–P5); validation errors are NOT `error` events — they ride
// an applied page (T5 onError callback + T8 success event).

import { applyPage } from '../pure/applyPage'
import { resolveTarget } from '../pure/resolveTarget'
import type { ScopePage, ScopeVisit, VisitParams } from '../pure/types'
import { sameUrl, toUrl } from '../pure/url'
import type { ScopeContext } from './runVisit'
import type { TransportResult } from './transport'

export async function handleResult(
  ctx: ScopeContext,
  visit: ScopeVisit,
  params: VisitParams,
  result: TransportResult,
): Promise<void> {
  switch (result.kind) {
    case 'page':
      return routePage(ctx, visit, params, result.page, result.serverTarget)

    case 'location':
      ctx.failInitial('initial load failed (location)')
      ctx.root.hardVisit(result.url) // P2
      return

    case 'aborted':
      params.onCancel?.() // P6
      ctx.emitter.emit('cancel', { visit })
      return

    case 'invalid':
    case 'http':
    case 'network':
      ctx.failInitial(`initial load failed (${result.kind})`)
      ctx.emitter.emit('error', { errors: {}, visit }) // P3–P5: page unchanged
      return
  }
}

async function routePage(
  ctx: ScopeContext,
  visit: ScopeVisit,
  params: VisitParams,
  page: ScopePage,
  serverTarget: string | null,
): Promise<void> {
  // Page URLs from the server are host-relative — absolutize before comparing.
  const target = resolveTarget({
    serverTarget,
    incomingUrl: page.url,
    scopeUrl: toUrl(ctx.page.get()?.url ?? visit.url.href, ctx.root.currentUrl()).href,
    parentUrl: ctx.parentUrl(),
  })

  if (target === 'self') {
    return applySelf(ctx, visit, params, page)
  }
  if (target === 'parent' && ctx.parentApply) {
    return applyToParent(ctx, visit, params, page) // T7
  }
  return applyToRoot(ctx, visit, params, page) // T6: root, or parent with root parent
}

// T7: the parent scope receives the page; this scope is done.
async function applyToParent(ctx: ScopeContext, visit: ScopeVisit, params: VisitParams, page: ScopePage): Promise<void> {
  ctx.parentApply!(page)
  ctx.emitter.emit('success', { page, visit }) // T8
  await params.onSuccess?.(page)
  ctx.dispose()
}

// T6: apply on the root without a request, then this scope is done. Deferred
// props of the new root page are fetched with one root reload.
async function applyToRoot(ctx: ScopeContext, visit: ScopeVisit, params: VisitParams, page: ScopePage): Promise<void> {
  const rootUrl = ctx.root.currentUrl()
  if (sameUrl(page.url, rootUrl, rootUrl)) {
    ctx.root.replace(page)
  } else {
    ctx.root.push(page)
  }
  ctx.emitter.emit('success', { page, visit }) // T8
  await params.onSuccess?.(page)
  ctx.dispose()
  const deferredKeys = Object.values(page.deferredProps ?? {}).flat()
  if (deferredKeys.length > 0) {
    ctx.root.reload(deferredKeys)
  }
}

async function applySelf(
  ctx: ScopeContext,
  visit: ScopeVisit,
  params: VisitParams,
  incoming: ScopePage,
): Promise<void> {
  const partial = visit.only.length > 0 || visit.except.length > 0
  const next = applyPage(ctx.page.get(), incoming, { partial })
  ctx.setPage(next)

  ctx.emitter.emit('success', { page: next, visit }) // T8

  const errors = next.props.errors
  if (Object.keys(errors).length > 0) {
    params.onError?.(errors) // T5
  } else {
    await params.onSuccess?.(next) // T5, awaited (F17)
  }

  loadDeferred(ctx, next, visit)
}

// D1/D2: after a self apply, fetch still-missing deferred props with ONE
// partial reload (a normal GET — C1 applies, which is what makes D3 work).
function loadDeferred(ctx: ScopeContext, page: ScopePage, visit: ScopeVisit): void {
  const missing = Object.values(page.deferredProps ?? {})
    .flat()
    .filter((key) => page.props[key] === undefined)

  if (missing.length === 0) {
    return
  }

  // Loop guard: this visit already asked for exactly these keys and the
  // server did not deliver them — asking again would loop forever.
  if (missing.length === visit.only.length && missing.every((key) => visit.only.includes(key))) {
    return
  }

  ctx.selfReload(missing)
}
