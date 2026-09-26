// Tests for core/transport.ts — classification per the P table plus the
// GET/non-GET body rule (U2).
import { HttpNetworkError, HttpResponseError } from '@inertiajs/core'
import { expect, it } from 'vitest'
import { createTransport } from '../src/core/transport'
import { fakeClient, pageResponse } from './fakes'
import type { TransportRequest } from '../src/core/transport'

const req = (overrides: Partial<TransportRequest> = {}): TransportRequest => ({
  method: 'get',
  url: 'http://app.test/scopes/users',
  headers: { 'X-Inertia': 'true' },
  signal: new AbortController().signal,
  ...overrides,
})

it('P: 2xx + x-inertia → page, serverTarget from x-inertia-scope-target', async () => {
  const client = fakeClient([
    { response: pageResponse({}, { 'x-inertia-scope-target': 'parent' }) },
    { response: pageResponse() },
  ])
  const transport = createTransport(client)

  const first = await transport.send(req())
  expect(first).toMatchObject({ kind: 'page', serverTarget: 'parent' })
  expect(first.kind === 'page' && first.page.component).toBe('Scopes/Users')

  expect(await transport.send(req())).toMatchObject({ kind: 'page', serverTarget: null })
})

it('P2: 409 + x-inertia-location → location', async () => {
  const error = new HttpResponseError('conflict', {
    status: 409,
    data: '',
    headers: { 'x-inertia-location': 'http://app.test/fresh' },
  })
  const transport = createTransport(fakeClient([{ error }]))

  expect(await transport.send(req())).toEqual({ kind: 'location', url: 'http://app.test/fresh' })
})

it('P3: 2xx without x-inertia → invalid', async () => {
  const transport = createTransport(fakeClient([{ response: { status: 200, data: '<html>', headers: {} } }]))

  expect(await transport.send(req())).toEqual({ kind: 'invalid' })
})

it('P3: bad JSON → invalid', async () => {
  const transport = createTransport(
    fakeClient([{ response: { status: 200, data: 'not json', headers: { 'x-inertia': 'true' } } }]),
  )

  expect(await transport.send(req())).toEqual({ kind: 'invalid' })
})

it('P4: HTTP error status → http with status', async () => {
  const error = new HttpResponseError('server error', { status: 500, data: '', headers: {} })
  const transport = createTransport(fakeClient([{ error }]))

  expect(await transport.send(req())).toEqual({ kind: 'http', status: 500 })
})

it('P5: network failure and unrecognized errors → network', async () => {
  const transport = createTransport(
    fakeClient([{ error: new HttpNetworkError('offline') }, { error: new Error('weird') }]),
  )

  expect(await transport.send(req())).toEqual({ kind: 'network' })
  expect(await transport.send(req())).toEqual({ kind: 'network' })
})

it('P6: abort → aborted', async () => {
  const transport = createTransport(fakeClient([{ error: { code: 'ERR_CANCELLED' } }]))

  expect(await transport.send(req())).toEqual({ kind: 'aborted' })
})

it('U2: GET sends no body; non-GET sends JSON data with content type', async () => {
  const client = fakeClient([{ response: pageResponse() }, { response: pageResponse() }])
  const transport = createTransport(client)

  await transport.send(req({ data: { ignored: true } }))
  await transport.send(req({ method: 'post', data: { name: 'x' } }))

  expect(client.requests[0].data).toBeUndefined()
  expect(client.requests[0].headers).not.toHaveProperty('Content-Type')
  expect(client.requests[1].data).toEqual({ name: 'x' })
  expect(client.requests[1].headers).toMatchObject({ 'Content-Type': 'application/json' })
})
