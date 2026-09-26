// Tests for M06: createScope load/lifecycle (L1, L2), request building
// (Q2–Q4, U1, U2, A2–A4), self-apply (T5, T8), finish guarantee (P1), P2.
// Uses the real transport over fakeClient; deferredTransport for in-flight cases.
import { HttpResponseError } from '@inertiajs/core'
import { expect, it, vi } from 'vitest'
import { createScope, type ScopeDeps } from '../src/core/createScope'
import { createTransport } from '../src/core/transport'
import type { ScopePage, ScopeVisit } from '../src/pure/types'
import { deferredTransport, fakeClient, fakeRoot, pageResponse } from './fakes'

type Outcome = Parameters<typeof fakeClient>[0]

const scopePage = (over: Partial<ScopePage> = {}): ScopePage => ({
  component: 'Scopes/Users',
  props: { errors: {} },
  url: '/scopes/users',
  version: 'v1',
  rescuedProps: [],
  ...over,
})

// A scope over the real transport + fakeClient, ready at once via `page`.
const makeReady = (outcomes: Outcome, getVersion: () => string | null = () => 'v1') => {
  const client = fakeClient(outcomes)
  const root = fakeRoot()
  const scope = createScope(
    { page: scopePage(), name: 'test' },
    { transport: createTransport(client), root: root.adapter, getVersion },
  )
  return { scope, client, root }
}

const flush = () => new Promise((resolve) => setTimeout(resolve))

it('L1: neither url nor page throws; both throw', () => {
  const deps: ScopeDeps = { transport: deferredTransport().transport, root: fakeRoot().adapter, getVersion: () => null }
  expect(() => createScope({}, deps)).toThrow(/either/)
  expect(() => createScope({ url: '/a', page: scopePage() }, deps)).toThrow(/either/)
})

it('L2: status goes loading → ready; ready() resolves with the first page', async () => {
  const client = fakeClient([{ response: pageResponse() }])
  const scope = createScope(
    { url: '/scopes/users' },
    { transport: createTransport(client), root: fakeRoot().adapter, getVersion: () => 'v1' },
  )

  expect(scope.status()).toBe('loading')
  const first = await scope.ready()
  expect(scope.status()).toBe('ready')
  expect(first.component).toBe('Scopes/Users')
  expect(scope.page.get()).toBe(first)
})

it('L2: ready() rejects when the initial load fails', async () => {
  const error = new HttpResponseError('boom', { status: 500, data: '', headers: {} })
  const scope = createScope(
    { url: '/scopes/users' },
    { transport: createTransport(fakeClient([{ error }])), root: fakeRoot().adapter, getVersion: () => 'v1' },
  )

  await expect(scope.ready()).rejects.toThrow(/initial load failed \(http\)/)
})

it('Q2: partial headers use the current component and are ignored on the initial load', async () => {
  // In-flight initial load: a visit with `only` sends no partial headers.
  const { transport, pending } = deferredTransport()
  const loading = createScope(
    { url: '/scopes/users' },
    { transport, root: fakeRoot().adapter, getVersion: () => 'v1' },
  )
  loading.visit('/scopes/users', { only: ['users'] })
  expect(pending[1].req.headers).not.toHaveProperty('X-Inertia-Partial-Component')

  // Ready scope: partial headers carry the current component.
  const { scope, client } = makeReady([{ response: pageResponse() }])
  scope.visit('/scopes/users', { only: ['users'] })
  await flush()
  expect(client.requests[0].headers).toMatchObject({
    'X-Inertia-Partial-Component': 'Scopes/Users',
    'X-Inertia-Partial-Data': 'users',
  })
})

it('Q3: the version is read when the request is sent', async () => {
  let version = 'v1'
  const { scope, client } = makeReady([{ response: pageResponse() }], () => version)

  version = 'v2'
  scope.visit('/scopes/users')
  await flush()

  expect(client.requests[0].headers).toMatchObject({ 'X-Inertia-Version': 'v2' })
})

it('Q4: onBefore returning false cancels before anything is sent', async () => {
  const { scope, client } = makeReady([{ response: pageResponse() }])
  const onStart = vi.fn()
  const onFinish = vi.fn()

  scope.visit('/scopes/users', { onBefore: () => false, onStart, onFinish })
  await flush()

  expect(client.requests).toHaveLength(0)
  expect(onStart).not.toHaveBeenCalled()
  expect(onFinish).not.toHaveBeenCalled() // P1: it never started
})

it('Q4: a before listener returning false cancels before anything is sent', async () => {
  const { scope, client } = makeReady([{ response: pageResponse() }])
  scope.on('before', () => false)

  scope.visit('/scopes/users')
  await flush()

  expect(client.requests).toHaveLength(0)
})

it('A2: unknown visit params are ignored silently', async () => {
  const { scope, client } = makeReady([{ response: pageResponse() }])

  scope.visit('/scopes/users', { preserveScroll: true, replace: true, async: true, viewTransition: false })
  await flush()

  expect(client.requests).toHaveLength(1)
})

it('A3: start and finish receive the same visit object', async () => {
  const { scope } = makeReady([{ response: pageResponse() }])
  const seen: ScopeVisit[] = []
  scope.on('start', ({ detail }) => seen.push(detail.visit))
  scope.on('finish', ({ detail }) => seen.push(detail.visit))

  scope.visit('/scopes/users', {
    onStart: (visit) => seen.push(visit),
    onFinish: (visit) => seen.push(visit),
  })
  await flush()

  expect(seen).toHaveLength(4)
  expect(new Set(seen).size).toBe(1) // one identity everywhere
  expect(seen[0].scope).toEqual({ id: scope.id, name: 'test' })
})

it('A4: onCancelToken is called before onStart and cancel() aborts (P6)', async () => {
  const { transport } = deferredTransport()
  const root = fakeRoot()
  const scope = createScope(
    { page: scopePage(), name: 'test' },
    { transport, root: root.adapter, getVersion: () => 'v1' },
  )
  const order: string[] = []
  const onCancel = vi.fn()
  const onFinish = vi.fn()
  const cancelEvent = vi.fn()
  scope.on('cancel', cancelEvent)

  let cancel = () => {}
  scope.visit('/scopes/users', {
    onCancelToken: (token) => {
      order.push('token')
      cancel = token.cancel
    },
    onStart: () => order.push('start'),
    onCancel,
    onFinish,
  })

  expect(order).toEqual(['token', 'start'])
  cancel()
  await flush()

  expect(onCancel).toHaveBeenCalledTimes(1)
  expect(cancelEvent).toHaveBeenCalledTimes(1)
  expect(onFinish).toHaveBeenCalledTimes(1) // P1: it started, so it finishes
})

it('U1: relative URLs resolve against the scope page URL', async () => {
  const { scope, client } = makeReady([{ response: pageResponse() }])

  scope.visit('?page=2')
  await flush()

  // fakeRoot lives on http://app.test/dashboard — only the origin comes from it.
  expect(client.requests[0].url).toBe('http://app.test/scopes/users?page=2')
})

it('U2: GET data merges into the query string, no body', async () => {
  const { scope, client } = makeReady([{ response: pageResponse() }])

  scope.visit('/scopes/users', { data: { search: 'Mül' } })
  await flush()

  expect(client.requests[0].url).toBe('http://app.test/scopes/users?search=M%C3%BCl')
  expect(client.requests[0].data).toBeUndefined()
})

it('T5: validation errors → onError; clean page → onSuccess', async () => {
  const withErrors = pageResponse({ props: { errors: { name: 'required' } } })
  const { scope, client } = makeReady([{ response: withErrors }, { response: pageResponse() }])
  const onError = vi.fn()
  const onSuccess = vi.fn()

  scope.visit('/scopes/users', { method: 'post', onError, onSuccess })
  await flush()
  expect(onError).toHaveBeenCalledExactlyOnceWith({ name: 'required' })
  expect(onSuccess).not.toHaveBeenCalled()
  expect(client.requests[0].data).toEqual({}) // non-GET body present

  scope.visit('/scopes/users', { onError, onSuccess })
  await flush()
  expect(onSuccess).toHaveBeenCalledTimes(1)
  expect(onError).toHaveBeenCalledTimes(1)
})

it('T8: a success event is emitted for every applied page', async () => {
  const { scope } = makeReady([{ response: pageResponse({ props: { errors: { x: 'bad' } } }) }])
  const success = vi.fn()
  scope.on('success', success)

  scope.visit('/scopes/users')
  await flush()

  // Even a page carrying validation errors was applied (T8 + T5).
  expect(success).toHaveBeenCalledTimes(1)
  expect(success.mock.calls[0][0].detail.page).toBe(scope.page.get())
})

it('P1: onFinish fires exactly once, also for error results', async () => {
  const error = new HttpResponseError('boom', { status: 500, data: '', headers: {} })
  const { scope } = makeReady([{ response: pageResponse() }, { error }])
  const onFinish = vi.fn()
  const errorEvent = vi.fn()
  scope.on('error', errorEvent)

  scope.visit('/scopes/users', { onFinish })
  await flush()
  scope.visit('/scopes/users', { onFinish })
  await flush()

  expect(onFinish).toHaveBeenCalledTimes(2)
  expect(errorEvent).toHaveBeenCalledTimes(1) // P4, with empty errors
  expect(errorEvent.mock.calls[0][0].detail.errors).toEqual({})
})

it('P2: a location result hard-visits via the root', async () => {
  const error = new HttpResponseError('conflict', {
    status: 409,
    data: '',
    headers: { 'x-inertia-location': 'http://app.test/fresh' },
  })
  const { scope, root } = makeReady([{ error }])

  scope.visit('/scopes/users')
  await flush()

  expect(root.calls.hardVisit).toEqual(['http://app.test/fresh'])
})
