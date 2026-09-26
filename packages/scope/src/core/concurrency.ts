// Concurrency gate per scope (D-04): GETs are "latest wins" (C1), one
// non-GET at a time blocks all new visits (C2), and a starting non-GET
// aborts an in-flight GET (C3). The caller checks blocked() before running
// any visit callbacks; begin() returning null covers reentrant races only.

import type { Method } from '../pure/types'

export type Concurrency = {
  blocked(): boolean
  begin(method: Method): AbortController | null
  finish(controller: AbortController): void
  abortAll(): void
}

export function createConcurrency(): Concurrency {
  let currentGet: AbortController | null = null
  let currentSubmit: AbortController | null = null

  return {
    blocked: () => currentSubmit !== null, // C2

    begin(method) {
      if (currentSubmit) {
        return null // C2, reentrant edge — the caller already checked blocked()
      }
      currentGet?.abort() // C1 (new GET) / C3 (new non-GET)
      currentGet = null
      const controller = new AbortController()
      if (method === 'get') {
        currentGet = controller
      } else {
        currentSubmit = controller
      }
      return controller
    },

    finish(controller) {
      if (currentGet === controller) {
        currentGet = null
      }
      if (currentSubmit === controller) {
        currentSubmit = null
      }
    },

    abortAll() {
      currentGet?.abort()
      currentSubmit?.abort()
      currentGet = null
      currentSubmit = null
    },
  }
}
