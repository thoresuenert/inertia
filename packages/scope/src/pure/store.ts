// Minimal reactive value store for the scope page. get/subscribe are
// compatible with React's useSyncExternalStore (get is the snapshot).
// set() with the same value (Object.is) does not notify.

export type Store<T> = {
  get(): T
  set(value: T): void
  subscribe(listener: (value: T) => void): () => void
}

export function createStore<T>(initial: T): Store<T> {
  let current = initial
  const listeners = new Set<(value: T) => void>()

  return {
    get: () => current,

    set(value) {
      if (Object.is(value, current)) {
        return
      }
      current = value
      for (const listener of [...listeners]) {
        listener(value)
      }
    },

    subscribe(listener) {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
  }
}
