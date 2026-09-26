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

  return {
    ...incoming,
    props,
    rescuedProps: incoming.rescuedProps ?? [],
  }
}
