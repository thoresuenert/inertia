// Applies a transport result to the scope. M06: pages always target `self`
// (T5, T8) — target routing to parent/root arrives in M07. Transport failures
// emit `error` with empty errors (P3–P5); validation errors are NOT `error`
// events — they ride an applied page (T5 onError callback + T8 success event).

import { applyPage } from '../pure/applyPage'
import type { ScopePage, ScopeVisit, VisitParams } from '../pure/types'
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
      return applySelf(ctx, visit, params, result.page)

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
}
