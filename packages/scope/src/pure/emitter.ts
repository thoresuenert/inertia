// Generic event emitter, shaped like Inertia's CustomEvents: listeners
// receive { detail } (A5). emit() returns false iff a listener returned
// exactly false (cancelable `before`, Q4); a throw is logged, never a cancel.
// The listener list is snapshotted at emit start, so listeners that
// unsubscribe others mid-emit cannot skip anyone.

export type Emitter<Details extends Record<string, unknown>> = {
  on<N extends keyof Details>(name: N, listener: (event: { detail: Details[N] }) => unknown): () => void
  emit<N extends keyof Details>(name: N, detail: Details[N]): boolean
  clear(): void
}

export function createEmitter<Details extends Record<string, unknown>>(): Emitter<Details> {
  const listeners = new Map<keyof Details, Set<(event: { detail: never }) => unknown>>()

  return {
    on(name, listener) {
      let set = listeners.get(name)
      if (!set) {
        set = new Set()
        listeners.set(name, set)
      }
      set.add(listener as (event: { detail: never }) => unknown)
      return () => {
        set.delete(listener as (event: { detail: never }) => unknown)
      }
    },

    emit(name, detail) {
      let cancelled = false
      for (const listener of [...(listeners.get(name) ?? [])]) {
        try {
          if (listener({ detail: detail as never }) === false) {
            cancelled = true
          }
        } catch (error) {
          console.error(`scope emitter: listener for "${String(name)}" threw`, error)
        }
      }
      return !cancelled
    },

    clear() {
      listeners.clear()
    },
  }
}
