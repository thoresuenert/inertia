// @vitest-environment jsdom
// Tests for M10: <RouterScope> — R1 (providers + fallback), R2 (remount on
// component change), R3 (onDispose = self-disposal only), R4 (nesting via
// __scope, proven through T7), L6 (StrictMode + unmount dispose).
// First real Part A + Part B integration: providers come from the built
// @inertiajs/react.
import type { Page } from '@inertiajs/core'
import { PageProvider, usePage, useRouter } from '@inertiajs/react'
import { act, cleanup, render, screen } from '@testing-library/react'
import { StrictMode, useEffect } from 'react'
import { afterEach, expect, it, vi } from 'vitest'
import type { ScopeRouter } from '../../src/core/surface'
import type { TransportResult } from '../../src/core/transport'
import type { ScopePage } from '../../src/pure/types'
import RouterScope from '../../src/react/RouterScope'
import { deferredTransport, fakeRoot } from '../fakes'

;(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true
afterEach(cleanup)

const rootPage = {
  component: 'Dashboard',
  props: { errors: {} },
  url: '/dashboard',
  version: 'v7',
  rescuedProps: [],
} as unknown as Page

const scopePage = (over: Partial<ScopePage> = {}): ScopePage => ({
  component: 'Scopes/Users',
  props: { errors: {} },
  url: '/scopes/users',
  version: 'v7',
  rescuedProps: [],
  ...over,
})

const pageResult = (url: string, over: Partial<ScopePage> = {}): TransportResult => ({
  kind: 'page',
  page: scopePage({ url, ...over }),
  serverTarget: null,
})

// Probe: captures the scope router and shows the scope page URL.
const captured: { scope?: ScopeRouter } = {}
const Probe = () => {
  const page = usePage()
  const router = useRouter()
  captured.scope = router as unknown as ScopeRouter
  return (
    <div data-testid="probe">
      {page.url}|{String((router as { __scope?: boolean }).__scope === true)}
    </div>
  )
}

const flush = () => new Promise((resolve) => setTimeout(resolve))

it('R1: fallback until ready, then the component with scope page and scope router', async () => {
  const { transport, pending } = deferredTransport()
  const root = fakeRoot()

  render(
    <PageProvider value={rootPage}>
      <RouterScope
        url="/scopes/users"
        name="picker"
        fallback={<span>loading…</span>}
        deps={{ transport, root: root.adapter, resolve: async () => Probe }}
      />
    </PageProvider>,
  )

  expect(screen.getByText('loading…')).toBeDefined()
  expect(pending[0].req.headers['X-Inertia-Scope']).toBe('picker')

  await act(async () => pending[0].resolve(pageResult('/scopes/users?page=2')))

  const probe = await screen.findByTestId('probe')
  expect(probe.textContent).toBe('/scopes/users?page=2|true')
})

it('R2: the component remounts when page.component changes', async () => {
  const { transport, pending } = deferredTransport()
  const root = fakeRoot()
  let mounts = 0
  const Counting = () => {
    useEffect(() => {
      mounts++
    }, [])
    return <Probe />
  }

  render(
    <PageProvider value={rootPage}>
      <RouterScope url="/scopes/users" deps={{ transport, root: root.adapter, resolve: async () => Counting }} />
    </PageProvider>,
  )
  await act(async () => pending[0].resolve(pageResult('/scopes/users')))
  await screen.findByTestId('probe')
  expect(mounts).toBe(1)

  act(() => captured.scope!.visit('/scopes/users?v=2'))
  // Same pathname → self; different component name → new key → remount.
  await act(async () => pending[1].resolve(pageResult('/scopes/users?v=2', { component: 'Scopes/UsersDetail' })))
  await flush()

  expect(mounts).toBe(2)
})

it('R3: onDispose fires on self-disposal, not on unmount', async () => {
  const selfDispose = vi.fn()
  const first = deferredTransport()
  const root = fakeRoot()

  render(
    <PageProvider value={rootPage}>
      <RouterScope
        url="/scopes/users"
        onDispose={selfDispose}
        deps={{ transport: first.transport, root: root.adapter, resolve: async () => Probe }}
      />
    </PageProvider>,
  )
  await act(async () => first.pending[0].resolve(pageResult('/scopes/users')))
  await screen.findByTestId('probe')

  // A POST answered with a foreign URL → T4 root target → self-disposal.
  act(() => captured.scope!.post('/scopes/users'))
  await act(async () => first.pending[1].resolve(pageResult('/belege', { component: 'Belege/Index' })))
  expect(selfDispose).toHaveBeenCalledTimes(1)
  expect(root.calls.push).toHaveLength(1)

  // Unmount case: a fresh scope, never self-disposed.
  const unmountSpy = vi.fn()
  const second = deferredTransport()
  const view = render(
    <PageProvider value={rootPage}>
      <RouterScope
        url="/scopes/users"
        onDispose={unmountSpy}
        deps={{ transport: second.transport, root: root.adapter, resolve: async () => Probe }}
      />
    </PageProvider>,
  )
  await act(async () => second.pending[second.pending.length - 1].resolve(pageResult('/scopes/users')))
  view.unmount()

  expect(unmountSpy).not.toHaveBeenCalled()
  expect(captured.scope!.status()).toBe('disposed') // L6: unmount disposes
})

it('R4: a nested RouterScope gets the outer scope as parent (T7)', async () => {
  const outer = deferredTransport()
  const inner = deferredTransport()
  const root = fakeRoot()
  const innerDispose = vi.fn()

  const innerCaptured: { scope?: ScopeRouter } = {}
  const InnerProbe = () => {
    innerCaptured.scope = useRouter() as unknown as ScopeRouter
    return <div data-testid="inner">{usePage().url}</div>
  }
  const OuterComp = () => (
    <div>
      <div data-testid="outer-url">{usePage().url}</div>
      <RouterScope
        url="/scopes/users/create"
        name="inner"
        fallback={<span>inner-loading</span>}
        onDispose={innerDispose}
        deps={{ transport: inner.transport, root: root.adapter, resolve: async () => InnerProbe }}
      />
    </div>
  )

  render(
    <PageProvider value={rootPage}>
      <RouterScope url="/scopes/users" name="outer" deps={{ transport: outer.transport, root: root.adapter, resolve: async () => OuterComp }} />
    </PageProvider>,
  )
  await act(async () => outer.pending[0].resolve(pageResult('/scopes/users')))
  await screen.findByTestId('outer-url')
  await act(async () => inner.pending[0].resolve(pageResult('/scopes/users/create', { component: 'Scopes/UserCreate' })))
  await screen.findByTestId('inner')

  // The inner response targets the OUTER pathname → T7: outer page updated,
  // inner disposed, root untouched.
  act(() => innerCaptured.scope!.post('/scopes/users/create'))
  await act(async () => inner.pending[1].resolve(pageResult('/scopes/users?created=1')))

  expect(screen.getByTestId('outer-url').textContent).toBe('/scopes/users?created=1')
  expect(innerDispose).toHaveBeenCalledTimes(1)
  expect(innerCaptured.scope!.status()).toBe('disposed')
  expect(root.calls.push).toHaveLength(0)
})

it('L6: StrictMode creates exactly one live scope; unmount disposes it', async () => {
  const { transport, pending } = deferredTransport()
  const root = fakeRoot()

  const view = render(
    <StrictMode>
      <PageProvider value={rootPage}>
        <RouterScope url="/scopes/users" deps={{ transport, root: root.adapter, resolve: async () => Probe }} />
      </PageProvider>
    </StrictMode>,
  )

  // StrictMode: two scopes created, the first disposed immediately → 2 initial loads.
  expect(pending).toHaveLength(2)
  await act(async () => pending[1].resolve(pageResult('/scopes/users')))
  const probe = await screen.findByTestId('probe')
  expect(probe.textContent).toContain('/scopes/users')
  expect(captured.scope!.status()).toBe('ready')

  view.unmount()
  expect(captured.scope!.status()).toBe('disposed')
})
