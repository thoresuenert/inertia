// Tests for pure/store.ts — notification rules of the page store.
import { expect, it, vi } from 'vitest'
import { createStore } from '../src/pure/store'

it('store: notifies subscribers with the new value on set', () => {
  const store = createStore<{ n: number } | null>(null)
  const listener = vi.fn()

  store.subscribe(listener)
  const next = { n: 1 }
  store.set(next)

  expect(store.get()).toBe(next)
  expect(listener).toHaveBeenCalledExactlyOnceWith(next)
})

it('store: does not notify after unsubscribe', () => {
  const store = createStore(0)
  const listener = vi.fn()

  const unsubscribe = store.subscribe(listener)
  unsubscribe()
  store.set(1)

  expect(listener).not.toHaveBeenCalled()
  expect(store.get()).toBe(1)
})

it('store: setting the same reference does not notify', () => {
  const value = { n: 1 }
  const store = createStore(value)
  const listener = vi.fn()

  store.subscribe(listener)
  store.set(value)

  expect(listener).not.toHaveBeenCalled()
})
