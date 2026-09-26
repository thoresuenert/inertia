// Tests for M07: concurrency (C1–C5), target routing (T1–T4, T6, T7),
// dispose (L3, L4) and root-navigation auto-dispose (L5).
import { afterEach, expect, it, vi } from 'vitest'
import { createScope, type Scope } from '../src/core/createScope'
import type { Transport, TransportResult } from '../src/core/transport'
import type { ScopePage } from '../src/pure/types'
import { deferredTransport, fakeRoot } from './fakes'

const scopePage = (over: Partial<ScopePage> = {}): ScopePage => ({
  component: 'Scopes/Users',
  props: { errors: {} },
  url: '/scopes/users',
  version: 'v1',
  rescuedProps: [],
  ...over,
})

const pageResult = (url: string, over: Partial<ScopePage> = {}, serverTarget: string | null = null): TransportResult => ({
  kind: 'page',
  page: scopePage({ url, ...over }),
  serverTarget,
})

// A ready scope over a deferred transport; fakeRoot lives on /dashboard.
const makeScope = (options: Parameters<typeof createScope>[0] = { page: scopePage(), name: 'test' }) => {
  const { transport, pending } = deferredTransport()
  const root = fakeRoot()
  const scope = createScope(options, { transport, root: root.adapter, getVersion: () => 'v1' })
  return { scope, pending, root, transport }
}

const childOf = (parent: Scope, root: ReturnType<typeof fakeRoot>, transport: Transport, name = 'child') =>
  createScope(
    { page: scopePage({ url: '/scopes/users/create', component: 'Scopes/UserCreate' }), name },
    { transport, root: root.adapter, getVersion: () => 'v1', parent },
  )

const flush = () => new Promise((resolve) => setTimeout(resolve))
const warnSpy = () => vi.spyOn(console, 'warn').mockImplementation(() => {})
afterEach(() => vi.restoreAllMocks())

it('C1: a new GET aborts an in-flight GET, latest wins', async () => {
  const { scope, pending } = makeScope()
  const onCancel = vi.fn()
  const onFinish = vi.fn()
  const cancelEvent = vi.fn()
  scope.on('cancel', cancelEvent)

  scope.visit('?page=1', { onCancel, onFinish })
  scope.visit('?page=2')
  await flush()

  expect(onCancel).toHaveBeenCalledTimes(1)
  expect(onFinish).toHaveBeenCalledTimes(1)
  expect(cancelEvent).toHaveBeenCalledTimes(1)

  pending[1].resolve(pageResult('/scopes/users?page=2'))
  await flush()
  expect(scope.page.get()!.url).toBe('/scopes/users?page=2')
})

it('C2: while a non-GET is in flight, new visits are ignored with a warning', async () => {
  const { scope, pending } = makeScope()
  const warn = warnSpy()
  const onStart = vi.fn()

  scope.visit('/scopes/users', { method: 'post' })
  scope.visit('?page=2', { onStart })

  expect(pending).toHaveLength(1)
  expect(onStart).not.toHaveBeenCalled()
  expect(warn).toHaveBeenCalledWith(expect.stringContaining('non-GET'))
})

it('C3: starting a non-GET aborts an in-flight GET', async () => {
  const { scope, pending } = makeScope()
  const onCancel = vi.fn()

  scope.visit('?page=1', { onCancel })
  scope.visit('/scopes/users', { method: 'post' })
  await flush()

  expect(onCancel).toHaveBeenCalledTimes(1)
  expect(pending).toHaveLength(2)
})

it('C4: responses of aborted requests are never applied', async () => {
  const { scope, pending } = makeScope()
  let cancel = () => {}

  scope.visit('?page=1', { onCancelToken: (token) => (cancel = token.cancel) })
  cancel()
  pending[0].resolve(pageResult('/scopes/users?page=1')) // late response loses
  await flush()

  expect(scope.page.get()!.url).toBe('/scopes/users')

  // Race variant: the transport resolved a page but the signal was already
  // aborted — runVisit coerces it to `aborted` (no abort listener in this fake).
  const sends: ((result: TransportResult) => void)[] = []
  const racyTransport: Transport = { send: () => new Promise((resolve) => sends.push(resolve)) }
  const racy = createScope(
    { page: scopePage(), name: 'racy' },
    { transport: racyTransport, root: fakeRoot().adapter, getVersion: () => 'v1' },
  )
  const onCancel = vi.fn()
  racy.visit('?page=2', { onCancelToken: (token) => (cancel = token.cancel), onCancel })
  cancel()
  sends[0](pageResult('/scopes/users?page=2'))
  await flush()

  expect(racy.page.get()!.url).toBe('/scopes/users')
  expect(onCancel).toHaveBeenCalledTimes(1)
})

it('C5: reload is a GET to the current scope URL', () => {
  const { scope, pending } = makeScope({ page: scopePage({ url: '/scopes/users?page=3' }), name: 'test' })

  scope.reload({ only: ['users'] })

  expect(pending[0].req.method).toBe('get')
  expect(pending[0].req.url).toBe('http://app.test/scopes/users?page=3')
})

it('T1: the server target wins end-to-end', async () => {
  const { scope, pending, root } = makeScope()

  scope.visit('?page=2')
  // Path says "self", the server says root.
  pending[0].resolve(pageResult('/scopes/users?page=2', {}, 'root'))
  await flush()

  expect(root.calls.push).toHaveLength(1)
  expect(scope.status()).toBe('disposed')
})

it('T2: same pathname as the scope URL → applied to self', async () => {
  const { scope, pending, root } = makeScope()

  scope.visit('?page=2')
  pending[0].resolve(pageResult('/scopes/users?page=2'))
  await flush()

  expect(scope.page.get()!.url).toBe('/scopes/users?page=2')
  expect(scope.status()).toBe('ready')
  expect(root.calls.push).toHaveLength(0)
})

it('T3: same pathname as the parent (root) URL → applied to the root', async () => {
  const { scope, pending, root } = makeScope()

  scope.visit('/scopes/users', { method: 'post' })
  pending[0].resolve(pageResult('/dashboard?tab=open', { component: 'Dashboard' }))
  await flush()

  expect(root.calls.push).toHaveLength(1) // query differs from /dashboard → push
  expect(scope.status()).toBe('disposed')
})

it('T4: any other URL → applied to the root', async () => {
  const { scope, pending, root } = makeScope()
  const onSuccess = vi.fn()
  const success = vi.fn()
  scope.on('success', success)

  scope.visit('/scopes/users', { method: 'post', onSuccess })
  pending[0].resolve(pageResult('/belege', { component: 'Belege/Index' }))
  await flush()

  expect(root.calls.push[0].component).toBe('Belege/Index')
  expect(success).toHaveBeenCalledTimes(1) // T8 also for root targets
  expect(onSuccess).toHaveBeenCalledTimes(1)
  expect(scope.status()).toBe('disposed')
})

it('T6: replace when the URL equals the current root URL, push otherwise', async () => {
  const replaceCase = makeScope()
  replaceCase.scope.visit('/scopes/users', { method: 'post' })
  replaceCase.pending[0].resolve(pageResult('/dashboard', { component: 'Dashboard' }))
  await flush()
  expect(replaceCase.root.calls.replace).toHaveLength(1)
  expect(replaceCase.root.calls.push).toHaveLength(0)

  const pushCase = makeScope()
  pushCase.scope.visit('/scopes/users', { method: 'post' })
  pushCase.pending[0].resolve(pageResult('/belege', { component: 'Belege/Index' }))
  await flush()
  expect(pushCase.root.calls.push).toHaveLength(1)
})

it('T6: deferred props of the new root page are fetched with one reload', async () => {
  const { scope, pending, root } = makeScope()

  scope.visit('/scopes/users', { method: 'post' })
  pending[0].resolve(pageResult('/dashboard', { component: 'Dashboard', deferredProps: { default: ['jobs'], other: ['stats'] } }))
  await flush()

  expect(root.calls.reload).toEqual([['jobs', 'stats']])
})

it('T7: a scope parent receives the page via applyPage, the child disposes', async () => {
  const { scope: parent, root, transport } = makeScope()
  const { transport: childTransport, pending: childPending } = deferredTransport()
  void transport
  const child = childOf(parent, root, childTransport)
  const onSuccess = vi.fn()

  child.visit('/scopes/users/create', { method: 'post', onSuccess })
  childPending[0].resolve(pageResult('/scopes/users?created=1'))
  await flush()

  expect(parent.page.get()!.url).toBe('/scopes/users?created=1')
  expect(onSuccess).toHaveBeenCalledTimes(1)
  expect(child.status()).toBe('disposed')
  expect(parent.status()).toBe('ready')
  expect(root.calls.push).toHaveLength(0)
})

it('L3: dispose order — silent abort, children before own dispose event, idempotent', async () => {
  const { scope, root, transport } = makeScope()
  const log: string[] = []
  const onCancel = vi.fn()

  scope.visit('?page=1', { onCancel, onFinish: () => log.push('finish') })
  const child = childOf(scope, root, transport)
  child.on('dispose', () => log.push('child-dispose'))
  scope.on('dispose', () => log.push('dispose-event'))

  scope.dispose()
  scope.dispose() // idempotent
  await flush()

  expect(log).toEqual(['child-dispose', 'dispose-event'])
  expect(onCancel).not.toHaveBeenCalled() // L3: no onCancel on dispose-abort
  expect(child.status()).toBe('disposed')
  expect(scope.status()).toBe('disposed')
})

it('L2: dispose rejects a pending ready()', async () => {
  const { scope } = makeScope({ url: '/scopes/users', name: 'test' })

  scope.dispose()

  await expect(scope.ready()).rejects.toThrow(/disposed/)
})

it('L4: visit methods after dispose warn and do nothing', () => {
  const { scope, pending } = makeScope()
  const warn = warnSpy()

  scope.dispose()
  scope.visit('/scopes/users')
  scope.reload()

  expect(pending).toHaveLength(0)
  expect(warn).toHaveBeenCalledTimes(2)
})

it('L5: a root navigation to a different pathname disposes the scope', () => {
  const { scope, root } = makeScope()

  root.navigate('http://app.test/belege')

  expect(scope.status()).toBe('disposed')
  expect(root.listenerCount()).toBe(0) // unsubscribed on dispose
})

it('L5: a root navigation on the same pathname keeps the scope', () => {
  const { scope, root } = makeScope()

  root.navigate('http://app.test/dashboard?tab=2')

  expect(scope.status()).toBe('ready')
})

it('L5: scopes with a scope parent do not watch root navigation', () => {
  const { scope: parent, root, transport } = makeScope()
  expect(root.listenerCount()).toBe(1)

  childOf(parent, root, transport)

  expect(root.listenerCount()).toBe(1) // still only the parent
})
