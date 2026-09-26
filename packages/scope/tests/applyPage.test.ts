// Tests for pure/applyPage.ts — rule T5 plus null/immutability behavior.
import { expect, it } from 'vitest'
import { applyPage } from '../src/pure/applyPage'
import type { ScopePage } from '../src/pure/types'

const page = (overrides: Partial<ScopePage> = {}): ScopePage => ({
  component: 'Scopes/Users',
  props: { errors: {}, users: ['a'], filters: { search: '' } },
  url: '/scopes/users',
  version: 'v1',
  rescuedProps: [],
  ...overrides,
})

it('T5: partial + same component → props merged over current', () => {
  const current = page()
  const incoming = page({ props: { errors: {}, users: ['b', 'c'] }, url: '/scopes/users?page=2' })

  const result = applyPage(current, incoming, { partial: true })

  expect(result.props.users).toEqual(['b', 'c'])
  expect(result.props.filters).toEqual({ search: '' }) // kept from current
  expect(result.url).toBe('/scopes/users?page=2') // non-props fields replaced
})

it('T5: partial + different component → replace', () => {
  const current = page()
  const incoming = page({ component: 'Scopes/Todos', props: { errors: {}, todos: [] } })

  const result = applyPage(current, incoming, { partial: true })

  expect(result.component).toBe('Scopes/Todos')
  expect(result.props).not.toHaveProperty('filters')
})

it('T5: not partial → replace even with same component', () => {
  const current = page()
  const incoming = page({ props: { errors: {}, users: ['b'] } })

  const result = applyPage(current, incoming, { partial: false })

  expect(result.props).not.toHaveProperty('filters')
})

it('T5: errors always from incoming, defaulting to {}', () => {
  const current = page({ props: { errors: { name: 'stale' }, users: [] } })
  const incoming = page({ props: { users: ['b'] } as unknown as ScopePage['props'] }) // no errors key

  const result = applyPage(current, incoming, { partial: true })

  expect(result.props.errors).toEqual({}) // stale error gone, default applied
})

it('T5: rescuedProps defaults to []', () => {
  const incoming = page()
  delete (incoming as Partial<ScopePage>).rescuedProps

  expect(applyPage(null, incoming, { partial: false }).rescuedProps).toEqual([])
})

it('applyPage: current null → incoming with defaults applied', () => {
  const incoming = page({ props: { users: [] } as unknown as ScopePage['props'] })

  const result = applyPage(null, incoming, { partial: true })

  expect(result.component).toBe('Scopes/Users')
  expect(result.props.errors).toEqual({})
})

it('applyPage: inputs are not mutated', () => {
  const current = deepFreeze(page())
  const incoming = deepFreeze(page({ props: { users: ['b'] } as unknown as ScopePage['props'] }))

  const result = applyPage(current, incoming, { partial: true })

  expect(result.props.errors).toEqual({})
  expect(incoming.props).not.toHaveProperty('errors') // incoming untouched
})

function deepFreeze<T>(value: T): T {
  if (typeof value === 'object' && value !== null) {
    Object.values(value).forEach(deepFreeze)
    Object.freeze(value)
  }
  return value
}
