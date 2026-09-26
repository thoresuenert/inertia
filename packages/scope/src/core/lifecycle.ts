// Scope teardown (L3, L4 support) and hierarchy wiring: child scopes register
// with their parent for cascade dispose (L3 step 3), root-parented scopes
// watch root navigation and dispose on a pathname change (L5).

import type { Emitter } from '../pure/emitter'
import type { ScopeEventDetailMap } from '../pure/types'
import { samePath } from '../pure/url'
import type { Concurrency } from './concurrency'
import type { RootAdapter } from './rootAdapter'

// Parent scope → its children's dispose functions, without widening the
// public Scope type. Keyed by the public scope object.
const childRegistries = new WeakMap<object, Set<() => void>>()

export function createLifecycle(input: {
  isDisposed: () => boolean
  markDisposed: () => void
  concurrency: Concurrency
  emitter: Emitter<ScopeEventDetailMap>
  remembered: Map<string, unknown>
}) {
  const cleanups: (() => void)[] = [] // poll stops (M08), L5 unsubscribe, parent unregister
  const children = new Set<() => void>()

  const dispose = () => {
    if (input.isDisposed()) {
      return // L3: idempotent
    }
    // Status first: blocks new visits (L4) and silences in-flight ones (L3).
    input.markDisposed()
    input.concurrency.abortAll() // 1. abort in-flight, no onCancel
    for (const cleanup of cleanups.splice(0)) {
      cleanup() // 2. stop polls, unsubscribe root navigate, unregister from parent
    }
    for (const child of [...children]) {
      child() // 3. dispose child scopes
    }
    input.emitter.emit('dispose', {}) // 4.
    input.emitter.clear() // 5.
    input.remembered.clear() // 6.
  }

  // Called once the public scope object exists (it is the registry key).
  const wire = (scope: object, parent: object | undefined, root: RootAdapter) => {
    childRegistries.set(scope, children)
    const siblings = parent ? childRegistries.get(parent) : undefined
    if (siblings) {
      siblings.add(dispose)
      cleanups.push(() => siblings.delete(dispose))
    } else if (!parent) {
      // L5: compare against the root URL the scope was opened over; same
      // pathname (partial reload, query change) keeps the scope.
      const openedOver = root.currentUrl()
      cleanups.push(
        root.onNavigate((url) => {
          if (!samePath(url, openedOver, openedOver)) {
            dispose()
          }
        }),
      )
    }
  }

  return { dispose, cleanups, wire }
}
