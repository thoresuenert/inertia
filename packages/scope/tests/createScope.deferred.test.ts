// Tests for M12 Part A: deferred props inside scopes (D1–D3) plus the
// loop guard for servers that never deliver a deferred key.
import { expect, it } from 'vitest'
import { createScope } from '../src/core/createScope'
import type { TransportResult } from '../src/core/transport'
import type { ScopePage } from '../src/pure/types'
import { deferredTransport, fakeRoot } from './fakes'

const widgetPage = (over: Partial<ScopePage> = {}): ScopePage => ({
  component: 'Scopes/Widget',
  props: { errors: {}, time: '12:00' },
  url: '/scopes/widget',
  version: 'v1',
  rescuedProps: [],
  deferredProps: { default: ['stats'] },
  ...over,
})

const result = (page: ScopePage): TransportResult => ({ kind: 'page', page, serverTarget: null })

const makeLoading = () => {
  const { transport, pending } = deferredTransport()
  const scope = createScope(
    { url: '/scopes/widget', name: 'widget' },
    { transport, root: fakeRoot().adapter, getVersion: () => 'v1' },
  )
  return { scope, pending }
}

const flush = () => new Promise((resolve) => setTimeout(resolve))

it('D1/D2: missing deferred keys trigger exactly one partial reload', async () => {
  const { pending } = makeLoading()

  pending[0].resolve(result(widgetPage({ deferredProps: { default: ['stats'], other: ['jobs'] } })))
  await flush()

  expect(pending).toHaveLength(2)
  expect(pending[1].req.method).toBe('get')
  expect(pending[1].req.headers['X-Inertia-Partial-Data']).toBe('stats,jobs')
  expect(pending[1].req.headers['X-Inertia-Partial-Component']).toBe('Scopes/Widget')
})

it('D2: no reload when all deferred props are present', async () => {
  const { pending } = makeLoading()

  pending[0].resolve(result(widgetPage({ props: { errors: {}, time: '12:00', stats: { total: 5 } } })))
  await flush()

  expect(pending).toHaveLength(1)
})

it('D3: a search that aborts the deferred fetch re-triggers it after applying', async () => {
  const { scope, pending } = makeLoading()

  pending[0].resolve(result(widgetPage()))
  await flush()
  expect(pending).toHaveLength(2) // the deferred fetch for `stats` is in flight

  scope.visit('/scopes/widget', { data: { search: 'a' }, only: ['users'] })
  await flush() // C1: the search aborts the deferred fetch
  expect(pending).toHaveLength(3)

  pending[2].resolve(result(widgetPage({ url: '/scopes/widget?search=a', props: { errors: {}, time: '12:00', users: [] } })))
  await flush()

  // D1 ran again on the applied search result → the deferred fetch is retried.
  expect(pending).toHaveLength(4)
  expect(pending[3].req.headers['X-Inertia-Partial-Data']).toBe('stats')

  pending[3].resolve(result(widgetPage({ props: { errors: {}, time: '12:00', stats: {} } })))
  await flush()
  expect(pending).toHaveLength(4) // satisfied, no further requests
})

it('D-guard: a deferred fetch that still misses its keys does not loop', async () => {
  const { pending } = makeLoading()

  pending[0].resolve(result(widgetPage()))
  await flush()
  expect(pending).toHaveLength(2)

  // The server answers the only=['stats'] fetch but stats is STILL undefined.
  pending[1].resolve(result(widgetPage()))
  await flush()

  expect(pending).toHaveLength(2) // no third request
})
