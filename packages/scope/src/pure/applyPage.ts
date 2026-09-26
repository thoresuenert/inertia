// Applies an incoming page to the current scope page (T5). Partial responses
// for the same component merge props over the current ones; everything else
// replaces. `errors` always come from incoming (default {}), `rescuedProps`
// default to []. Returns a new object, never mutates inputs.

import type { ScopePage } from './types'

export function applyPage(current: ScopePage | null, incoming: ScopePage, opts: { partial: boolean }): ScopePage {
  const merge = opts.partial && current !== null && current.component === incoming.component

  const props = merge ? { ...current.props, ...incoming.props } : { ...incoming.props }

  // Also in the merge case: a stale error from `current` must not survive a
  // partial reload that did not include errors.
  props.errors = incoming.props?.errors ?? {}

  const page: ScopePage = {
    ...incoming,
    props,
    rescuedProps: incoming.rescuedProps ?? [],
  }

  // T5/F-06: Laravel partial responses omit deferredProps — keep the current
  // map in the merge case, or an aborted deferred fetch is never retried (D3).
  if (merge && current?.deferredProps && incoming.deferredProps === undefined) {
    page.deferredProps = current.deferredProps
  }

  return page
}
