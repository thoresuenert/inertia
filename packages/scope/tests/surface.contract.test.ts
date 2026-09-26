// Tests for M08: the RouterSurface contract (A1) and the surface methods
// (A6–A9). The method list below is copied from 02-architecture.md / F13 —
// when Part A's RouterSurface type changes in M09, change it HERE too.
import { afterEach, expect, it, vi } from 'vitest'
import { createScope } from '../src/core/createScope'
import type { ScopePage } from '../src/pure/types'
import { deferredTransport, fakeRoot } from './fakes'

const ROUTER_SURFACE_METHODS = [
  'on', 'visit', 'get', 'post', 'put', 'patch', 'delete', 'reload',
  'poll', 'remember', 'restore', 'prefetch', 'getCached', 'getPrefetching', 'flush',
] as const

const scopePage = (over: Partial<ScopePage> = {}): ScopePage => ({
  component: 'Scopes/Users',
  props: { errors: {} },
  url: '/scopes/users',
  version: 'v1',
  rescuedProps: [],
  ...over,
})

const makeScope = () => {
  const { transport, pending } = deferredTransport()
  const root = fakeRoot()
  const scope = createScope(
    { page: scopePage(), name: 'test' },
    { transport, root: root.adapter, getVersion: () => 'v1' },
  )
  return { scope, pending, root }
}

afterEach(() => {
  vi.restoreAllMocks()
  vi.useRealTimers()
})

it('A1: the scope implements every RouterSurface method', () => {
  const { scope } = makeScope()
  for (const method of ROUTER_SURFACE_METHODS) {
    expect(typeof scope[method], method).toBe('function')
  }
})

it('surface: __scope marker is true', () => {
  expect(makeScope().scope.__scope).toBe(true)
})

it('A6: get/post/put/patch route to visit with method and data', () => {
  const { scope, pending } = makeScope()

  scope.get('/scopes/users', { search: 'a' })
  expect(pending[0].req).toMatchObject({ method: 'get', url: 'http://app.test/scopes/users?search=a' })

  for (const method of ['post', 'put', 'patch'] as const) {
    const fresh = makeScope()
    fresh.scope[method]('/scopes/users', { name: 'x' }, { headers: { 'X-Extra': '1' } })
    expect(fresh.pending[0].req).toMatchObject({ method, data: { name: 'x' } })
    expect(fresh.pending[0].req.headers['X-Extra']).toBe('1')
  }
})

it('A6: delete takes params only, data via params.data', () => {
  const { scope, pending } = makeScope()

  scope.delete('/scopes/users/5', { data: { reason: 'gone' } })

  expect(pending[0].req).toMatchObject({ method: 'delete', data: { reason: 'gone' } })
})

it('A7: poll reloads every interval; stop, start and destroy work', () => {
  vi.useFakeTimers()
  const { scope, pending } = makeScope()

  const handle = scope.poll(1000, { only: ['users'] })
  expect(typeof handle.destroy).toBe('function') // usePoll calls it on unmount (M09)
  vi.advanceTimersByTime(2100)
  expect(pending).toHaveLength(2)
  expect(pending[0].req.method).toBe('get')
  expect(pending[0].req.headers['X-Inertia-Partial-Data']).toBe('users')

  handle.stop()
  vi.advanceTimersByTime(2000)
  expect(pending).toHaveLength(2)

  handle.start()
  vi.advanceTimersByTime(1000)
  expect(pending).toHaveLength(3)

  handle.destroy()
  vi.advanceTimersByTime(2000)
  expect(pending).toHaveLength(3)
})

it('A7: polls are stopped on dispose and cannot be restarted', () => {
  vi.useFakeTimers()
  const { scope, pending } = makeScope()

  const handle = scope.poll(1000)
  scope.dispose()
  handle.start() // refused: scope is disposed
  vi.advanceTimersByTime(3000)

  expect(pending).toHaveLength(0)
})

it('A7: autoStart false waits for start()', () => {
  vi.useFakeTimers()
  const { scope, pending } = makeScope()

  const handle = scope.poll(1000, {}, { autoStart: false })
  vi.advanceTimersByTime(2000)
  expect(pending).toHaveLength(0)

  handle.start()
  vi.advanceTimersByTime(1000)
  expect(pending).toHaveLength(1)
})

it('A8: remember/restore roundtrip with default and named keys', () => {
  const { scope } = makeScope()

  scope.remember({ search: 'a' })
  scope.remember([1, 2], 'selection')

  expect(scope.restore()).toEqual({ search: 'a' })
  expect(scope.restore('selection')).toEqual([1, 2])
  expect(scope.restore('missing')).toBeUndefined()
})

it('A8: remembered state is cleared on dispose', () => {
  const { scope } = makeScope()

  scope.remember({ search: 'a' })
  scope.dispose()

  expect(scope.restore()).toBeUndefined()
})

it('A9: prefetch warns once, cache accessors return null, flush is a no-op', () => {
  const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
  const { scope } = makeScope()

  scope.prefetch()
  scope.prefetch()

  expect(warn).toHaveBeenCalledTimes(1)
  expect(scope.getCached()).toBeNull()
  expect(scope.getPrefetching()).toBeNull()
  expect(() => scope.flush()).not.toThrow()
})
