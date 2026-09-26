// Tests for core/rootAdapter.ts — field mapping to the core router (T6
// groundwork), onNavigate wiring (L5 groundwork), injected location.
import { expect, it, vi } from 'vitest'
import type { Router } from '@inertiajs/core'
import { createRootAdapter } from '../src/core/rootAdapter'
import type { ScopePage } from '../src/pure/types'

const page: ScopePage = {
  component: 'Belege/Index',
  props: { errors: {}, belege: [] },
  url: '/belege',
  version: 'v1',
  rescuedProps: [],
  flash: { success: 'saved' },
}

const fakeRouter = () => {
  const r = {
    push: vi.fn(),
    replace: vi.fn(),
    reload: vi.fn(),
    on: vi.fn(() => vi.fn()),
  }
  return r as unknown as Router & typeof r
}

const loc = () => ({ href: 'http://app.test/dashboard', assign: vi.fn() })

it('rootAdapter: push/replace map page fields and set preserveScroll/preserveState true', () => {
  const r = fakeRouter()
  const adapter = createRootAdapter(r, loc())

  adapter.push(page)
  adapter.replace(page)

  const expected = {
    component: 'Belege/Index',
    url: '/belege',
    props: page.props,
    flash: { success: 'saved' },
    preserveScroll: true,
    preserveState: true,
  }
  expect(r.push).toHaveBeenCalledExactlyOnceWith(expected)
  expect(r.replace).toHaveBeenCalledExactlyOnceWith(expected)
})

it('rootAdapter: reload passes only', () => {
  const r = fakeRouter()
  createRootAdapter(r, loc()).reload(['jobs', 'stats'])

  expect(r.reload).toHaveBeenCalledExactlyOnceWith({ only: ['jobs', 'stats'] })
})

it('rootAdapter: onNavigate delivers the page url and unsubscribes', () => {
  const r = fakeRouter()
  const seen: string[] = []

  const unsubscribe = createRootAdapter(r, loc()).onNavigate((url) => seen.push(url))

  expect(r.on).toHaveBeenCalledWith('navigate', expect.any(Function))
  const [, listener] = r.on.mock.calls[0] as unknown as [
    string,
    (event: { detail: { page: { url: string } } }) => void,
  ]
  listener({ detail: { page: { url: '/elsewhere' } } })
  expect(seen).toEqual(['/elsewhere'])

  unsubscribe()
  expect(r.on.mock.results[0].value).toHaveBeenCalled()
})

it('rootAdapter: currentUrl and hardVisit use the injected location', () => {
  const location = loc()
  const adapter = createRootAdapter(fakeRouter(), location)

  expect(adapter.currentUrl()).toBe('http://app.test/dashboard')
  adapter.hardVisit('http://app.test/fresh')
  expect(location.assign).toHaveBeenCalledExactlyOnceWith('http://app.test/fresh')
})
