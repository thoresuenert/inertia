// Tests for pure/emitter.ts — A5 delivery/unsubscribe/clear plus the
// emit-false and throwing-listener semantics.
import { expect, it, vi } from 'vitest'
import { createEmitter } from '../src/pure/emitter'
import type { ScopeEventDetailMap } from '../src/pure/types'

it('A5: listener receives { detail } and on returns an unsubscribe function', () => {
  const emitter = createEmitter<{ start: { visit: string } }>()
  const seen: unknown[] = []

  const unsubscribe = emitter.on('start', (event) => seen.push(event))
  emitter.emit('start', { visit: 'a' })

  expect(seen).toEqual([{ detail: { visit: 'a' } }])
  expect(typeof unsubscribe).toBe('function')
})

it('A5: unsubscribed listener is not called again', () => {
  const emitter = createEmitter<{ start: { n: number } }>()
  const listener = vi.fn()

  const unsubscribe = emitter.on('start', listener)
  emitter.emit('start', { n: 1 })
  unsubscribe()
  emitter.emit('start', { n: 2 })

  expect(listener).toHaveBeenCalledTimes(1)
})

it('A5: clear removes all listeners', () => {
  const emitter = createEmitter<{ start: { n: number }; finish: { n: number } }>()
  const listener = vi.fn()

  emitter.on('start', listener)
  emitter.on('finish', listener)
  emitter.clear()
  emitter.emit('start', { n: 1 })
  emitter.emit('finish', { n: 1 })

  expect(listener).not.toHaveBeenCalled()
})

it('emitter: emit returns false when a listener returns false, remaining listeners still run', () => {
  const emitter = createEmitter<{ before: { n: number } }>()
  const after = vi.fn()

  emitter.on('before', () => false)
  emitter.on('before', after)

  expect(emitter.emit('before', { n: 1 })).toBe(false)
  expect(after).toHaveBeenCalledTimes(1)
})

it('emitter: a throwing listener does not stop the others', () => {
  const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
  const emitter = createEmitter<{ start: { n: number } }>()
  const after = vi.fn()

  emitter.on('start', () => {
    throw new Error('boom')
  })
  emitter.on('start', after)

  expect(emitter.emit('start', { n: 1 })).toBe(true) // a throw is not a cancel
  expect(after).toHaveBeenCalledTimes(1)
  expect(errorSpy).toHaveBeenCalled()
  errorSpy.mockRestore()
})

it('emitter: generic fits the scope event map (compile-time check)', () => {
  const emitter = createEmitter<ScopeEventDetailMap>()
  const unsubscribe = emitter.on('success', ({ detail }) => {
    void detail.page.component // typed as ScopePage
    void detail.visit.method
  })
  unsubscribe()
  expect(true).toBe(true)
})
