// Reusable test fakes for the core layer: an HttpClient with queued outcomes,
// a canned Inertia page response, a recording RootAdapter, and a transport
// whose sends are resolved manually (M07 concurrency tests).

import type { HttpClient, HttpRequestConfig, HttpResponse } from '@inertiajs/core'
import type { RootAdapter } from '../src/core/rootAdapter'
import type { Transport, TransportRequest, TransportResult } from '../src/core/transport'
import type { ScopePage } from '../src/pure/types'

type Outcome = { response: HttpResponse } | { error: unknown }

export function fakeClient(outcomes: Outcome[]): HttpClient & { requests: HttpRequestConfig[] } {
  const queue = [...outcomes]
  const requests: HttpRequestConfig[] = []
  return {
    requests,
    async request(config) {
      requests.push(config)
      const outcome = queue.shift()
      if (!outcome) {
        throw new Error('fakeClient: no outcome queued')
      }
      if ('error' in outcome) {
        throw outcome.error
      }
      return outcome.response
    },
  }
}

export function pageResponse(page: Partial<ScopePage> = {}, headers: Record<string, string> = {}): HttpResponse {
  return {
    status: 200,
    data: JSON.stringify({
      component: 'Scopes/Users',
      props: { errors: {} },
      url: '/scopes/users',
      version: 'v1',
      rescuedProps: [],
      ...page,
    }),
    headers: { 'x-inertia': 'true', ...headers },
  }
}

export function fakeRoot(initialUrl = 'http://app.test/dashboard') {
  const calls: { push: ScopePage[]; replace: ScopePage[]; reload: string[][]; hardVisit: string[] } = {
    push: [],
    replace: [],
    reload: [],
    hardVisit: [],
  }
  const navigateListeners = new Set<(url: string) => void>()
  let url = initialUrl

  const adapter: RootAdapter = {
    currentUrl: () => url,
    push: (page) => calls.push.push(page),
    replace: (page) => calls.replace.push(page),
    reload: (only) => calls.reload.push(only),
    onNavigate: (cb) => {
      navigateListeners.add(cb)
      return () => navigateListeners.delete(cb)
    },
    hardVisit: (to) => calls.hardVisit.push(to),
  }

  return {
    adapter,
    calls,
    listenerCount: () => navigateListeners.size,
    // Simulates a root navigation: updates currentUrl, then notifies (L5 tests).
    navigate(to: string) {
      url = to
      for (const cb of [...navigateListeners]) {
        cb(to)
      }
    },
  }
}

export function deferredTransport() {
  const pending: { req: TransportRequest; resolve: (result: TransportResult) => void }[] = []
  const transport: Transport = {
    send: (req) =>
      new Promise<TransportResult>((resolve) => {
        // Like the real transport: an abort settles the send as `aborted`.
        req.signal.addEventListener('abort', () => resolve({ kind: 'aborted' }))
        pending.push({ req, resolve })
      }),
  }
  return { transport, pending }
}
