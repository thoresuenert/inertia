// Tests for pure/url.ts — rules U1 and U2, plus the samePath trailing
// slash rule documented in the url.ts header.
import { expect, it } from 'vitest'
import { mergeQuery, samePath, sameUrl, toUrl } from '../src/pure/url'

const base = 'http://app.test/scopes/users?page=1'

it('U1: relative ?page=2 resolves against the scope URL, not a browser URL', () => {
  expect(toUrl('?page=2', base).href).toBe('http://app.test/scopes/users?page=2')
})

it('U1: relative path resolves against the scope page URL', () => {
  expect(toUrl('detail', base).pathname).toBe('/scopes/detail')
  expect(toUrl('/other', base).pathname).toBe('/other')
})

it('samePath: same pathname, different query and hash → true', () => {
  expect(samePath('/scopes/users?page=2', 'http://app.test/scopes/users#top', base)).toBe(true)
  expect(samePath('/scopes/users', '/scopes/todos', base)).toBe(false)
})

it('samePath: trailing slash is normalized, root stays root', () => {
  expect(samePath('/users/', '/users', base)).toBe(true)
  expect(samePath('/', '/', base)).toBe(true)
  expect(samePath('/', '/users', base)).toBe(false)
})

it('T6: sameUrl compares pathname and query, ignores hash', () => {
  expect(sameUrl('/users?page=2', 'http://app.test/users?page=2#top', base)).toBe(true)
  expect(sameUrl('/users?page=2', '/users?page=3', base)).toBe(false)
  expect(sameUrl('/users/', '/users', base)).toBe(true)
})

it('U2: data overwrites existing query keys and keeps the others', () => {
  expect(mergeQuery('/scopes/users?page=3&search=a', { search: 'b' }, base)).toBe(
    'http://app.test/scopes/users?page=3&search=b',
  )
})

it('U2: null and undefined values remove the key', () => {
  expect(mergeQuery('/scopes/users?search=a&page=2', { search: null, missing: undefined }, base)).toBe(
    'http://app.test/scopes/users?page=2',
  )
})

it('U2: arrays serialize as key[]= and replace an existing set', () => {
  const result = new URL(mergeQuery('/scopes/users?status[]=old', { status: ['a', 'b'] }, base))
  expect(result.searchParams.getAll('status[]')).toEqual(['a', 'b'])
  expect(result.search).not.toContain('old')
})

it('U2: nested objects throw', () => {
  expect(() => mergeQuery('/scopes/users', { filter: { active: true } }, base)).toThrow(/nested objects/)
  expect(() => mergeQuery('/scopes/users', { items: [{ id: 1 }] }, base)).toThrow(/nested objects/)
})
