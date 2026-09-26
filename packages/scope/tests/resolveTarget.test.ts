// Tests for pure/resolveTarget.ts — rules T1–T4.
import { expect, it } from 'vitest'
import { resolveTarget } from '../src/pure/resolveTarget'

const base = {
  serverTarget: null,
  scopeUrl: 'http://app.test/scopes/users?page=2',
  parentUrl: 'http://app.test/dashboard',
}

it('T1: server target wins over path comparison', () => {
  // Path would say "self" (T2), but the server says root.
  expect(resolveTarget({ ...base, serverTarget: 'root', incomingUrl: '/scopes/users' })).toBe('root')
  expect(resolveTarget({ ...base, serverTarget: 'parent', incomingUrl: '/somewhere-else' })).toBe('parent')
})

it('T1: unknown server target value is ignored', () => {
  expect(resolveTarget({ ...base, serverTarget: 'none', incomingUrl: '/scopes/users' })).toBe('self')
  expect(resolveTarget({ ...base, serverTarget: 'SELF', incomingUrl: '/elsewhere' })).toBe('root')
})

it('T2: same pathname as the scope URL → self', () => {
  expect(resolveTarget({ ...base, incomingUrl: '/scopes/users?page=3' })).toBe('self')
  expect(resolveTarget({ ...base, incomingUrl: 'http://app.test/scopes/users/' })).toBe('self')
})

it('T3: same pathname as the parent URL → parent', () => {
  expect(resolveTarget({ ...base, incomingUrl: '/dashboard?tab=open' })).toBe('parent')
})

it('T4: anything else → root', () => {
  expect(resolveTarget({ ...base, incomingUrl: '/belege/42' })).toBe('root')
})
