// Decides where an incoming page is applied (T1–T4). The server header wins
// when it is a valid target; otherwise pathname comparison against the scope
// URL (self) and the parent URL (parent), falling back to root.

import type { Target } from './types'
import { samePath } from './url'

const validTargets: readonly Target[] = ['self', 'parent', 'root']

export function resolveTarget(input: {
  serverTarget: string | null
  incomingUrl: string
  scopeUrl: string
  parentUrl: string
}): Target {
  // T1: an explicit, valid server target wins; anything else is ignored.
  if (validTargets.includes(input.serverTarget as Target)) {
    return input.serverTarget as Target
  }

  // T2 before T3: when scope and parent share a pathname, the scope keeps it.
  if (samePath(input.incomingUrl, input.scopeUrl, input.scopeUrl)) {
    return 'self'
  }

  if (samePath(input.incomingUrl, input.parentUrl, input.scopeUrl)) {
    return 'parent'
  }

  return 'root' // T4
}
