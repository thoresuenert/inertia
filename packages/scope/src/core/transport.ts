// Sends one scope request through an injected HttpClient and classifies the
// outcome per the P table (03-rules.md). Never throws. Note: the client
// REJECTS on status >= 400 (F3), so 409/x-inertia-location lives in the catch
// branch. Laravel validation failures are NOT an `http` result — they arrive
// as redirected 2xx pages whose props carry `errors` (T5).

import { http, HttpCancelledError, HttpResponseError } from '@inertiajs/core'
import type { HttpClient, HttpResponse } from '@inertiajs/core'
import type { Method, ScopePage } from '../pure/types'

export type TransportRequest = {
  method: Method
  url: string
  data?: Record<string, unknown>
  headers: Record<string, string>
  signal: AbortSignal
}

export type TransportResult =
  | { kind: 'page'; page: ScopePage; serverTarget: string | null }
  | { kind: 'location'; url: string }
  | { kind: 'invalid' }
  | { kind: 'http'; status: number }
  | { kind: 'network' }
  | { kind: 'aborted' }

export type Transport = { send(req: TransportRequest): Promise<TransportResult> }

export function createTransport(client: HttpClient = http.getClient()): Transport {
  return {
    async send(req) {
      try {
        // Non-GET: data stays an object — the client stringifies it itself;
        // a pre-stringified body would be double-encoded (xhrHttpClient F1/F2).
        const response = await client.request({
          method: req.method,
          url: req.url,
          headers: req.method === 'get' ? req.headers : { ...req.headers, 'Content-Type': 'application/json' },
          data: req.method === 'get' ? undefined : (req.data ?? {}),
          signal: req.signal,
        })
        return classifyResponse(response)
      } catch (error) {
        return classifyError(error)
      }
    },
  }
}

function classifyResponse(response: HttpResponse): TransportResult {
  if (response.headers['x-inertia'] !== 'true') {
    return { kind: 'invalid' } // P3
  }
  try {
    const page = JSON.parse(response.data) as ScopePage
    return { kind: 'page', page, serverTarget: response.headers['x-inertia-scope-target'] ?? null }
  } catch {
    return { kind: 'invalid' } // P3: bad JSON
  }
}

function classifyError(error: unknown): TransportResult {
  // instanceof plus code fallback, in case a custom client rejects with a plain object.
  if (error instanceof HttpCancelledError || (error as { code?: string } | null)?.code === 'ERR_CANCELLED') {
    return { kind: 'aborted' } // P6
  }
  if (error instanceof HttpResponseError) {
    const location = error.response.headers['x-inertia-location']
    if (error.response.status === 409 && location) {
      return { kind: 'location', url: location } // P2
    }
    return { kind: 'http', status: error.response.status } // P4
  }
  return { kind: 'network' } // P5: HttpNetworkError and anything unrecognized
}
