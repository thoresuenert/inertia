// Tests for pure/headers.ts — rules Q1 (standard + scope headers, version,
// extra wins) and Q2 (partial headers).
import { expect, it } from 'vitest'
import { buildHeaders } from '../src/pure/headers'

const base = {
  version: 'v1',
  scopeName: 'user-picker',
  scopeUrl: 'http://app.test/scopes/users?page=2',
  parentUrl: 'http://app.test/dashboard',
}

it('Q1: standard and scope headers are all present', () => {
  expect(buildHeaders(base)).toEqual({
    'X-Requested-With': 'XMLHttpRequest',
    'X-Inertia': 'true',
    'X-Inertia-Version': 'v1',
    Accept: 'text/html, application/xhtml+xml',
    'X-Inertia-Scope': 'user-picker',
    'X-Inertia-Scope-Url': 'http://app.test/scopes/users?page=2',
    'X-Inertia-Scope-Parent-Url': 'http://app.test/dashboard',
  })
})

it('Q1: version header is omitted when version is null', () => {
  const headers = buildHeaders({ ...base, version: null })
  expect(headers).not.toHaveProperty('X-Inertia-Version')
})

it('Q1: extra headers are merged last and win', () => {
  const headers = buildHeaders({ ...base, extra: { 'X-Inertia-Scope': 'overridden', 'X-Custom': 'yes' } })
  expect(headers['X-Inertia-Scope']).toBe('overridden')
  expect(headers['X-Custom']).toBe('yes')
})

it('Q2: no partial headers without partial input', () => {
  const headers = buildHeaders(base)
  expect(headers).not.toHaveProperty('X-Inertia-Partial-Component')
  expect(headers).not.toHaveProperty('X-Inertia-Partial-Data')
  expect(headers).not.toHaveProperty('X-Inertia-Partial-Except')
})

it('Q2: partial headers with only — component + data, no except', () => {
  const headers = buildHeaders({ ...base, partial: { component: 'Scopes/Users', only: ['users', 'filters'], except: [] } })
  expect(headers['X-Inertia-Partial-Component']).toBe('Scopes/Users')
  expect(headers['X-Inertia-Partial-Data']).toBe('users,filters')
  expect(headers).not.toHaveProperty('X-Inertia-Partial-Except')
})

it('Q2: partial headers with except only — component + except, no data', () => {
  const headers = buildHeaders({ ...base, partial: { component: 'Scopes/Users', only: [], except: ['stats'] } })
  expect(headers['X-Inertia-Partial-Component']).toBe('Scopes/Users')
  expect(headers['X-Inertia-Partial-Except']).toBe('stats')
  expect(headers).not.toHaveProperty('X-Inertia-Partial-Data')
})

it('Q2: partial with empty only and except sends no partial headers', () => {
  const headers = buildHeaders({ ...base, partial: { component: 'Scopes/Users', only: [], except: [] } })
  expect(headers).not.toHaveProperty('X-Inertia-Partial-Component')
})
