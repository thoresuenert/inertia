// <RouterScope>: a self-contained Inertia island. Creates a scope on mount and
// disposes it on unmount (L6, StrictMode-safe), renders fallback until page +
// component are resolved (R1), remounts on component change (R2), reports
// self-disposal via onDispose (R3), nests via the __scope marker (R4).

import type { Page } from '@inertiajs/core'
import { PageProvider, router, RouterProvider, usePage, useRouter, type RouterSurface } from '@inertiajs/react'
import { ComponentType, ReactNode, useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { createScope, type Scope } from '../core/createScope'
import { createRootAdapter, type RootAdapter } from '../core/rootAdapter'
import type { ScopeRouter } from '../core/surface'
import { createTransport, type Transport } from '../core/transport'

type ResolveComponent = (name: string) => Promise<ComponentType>

export type RouterScopeProps = {
  url: string
  name?: string
  fallback?: ReactNode
  /** Fires when the scope disposes itself (T6/T7/L5 or scope.dispose()) — not on unmount (R3). */
  onDispose?: () => void
  /** @internal test hook: inject transport, root adapter and component resolution. */
  deps?: { transport?: Transport; root?: RootAdapter; resolve?: ResolveComponent }
}

// R4: scopes carry the __scope marker; the root router does not.
const isScope = (value: unknown): value is Scope => (value as { __scope?: boolean } | null)?.__scope === true

export default function RouterScope({ url, name, fallback = null, onDispose, deps }: RouterScopeProps) {
  const outerRouter = useRouter()
  // Read in the PARENT page context on purpose (root or outer scope): its
  // version is what scope requests must send (Q3).
  const outerPage = usePage()
  const versionRef = useRef(outerPage.version)
  versionRef.current = outerPage.version
  const onDisposeRef = useRef(onDispose)
  onDisposeRef.current = onDispose
  const depsRef = useRef(deps)
  depsRef.current = deps

  const [scope, setScope] = useState<ScopeRouter | null>(null)

  // L6: create in the effect, dispose in the cleanup. StrictMode's doubled
  // effect creates and immediately disposes a throwaway scope first.
  // outerRouter is intentionally not a dependency: the parent is fixed per mount.
  useEffect(() => {
    const injected = depsRef.current
    const created = createScope(
      { url, name },
      {
        transport: injected?.transport ?? createTransport(),
        root: injected?.root ?? createRootAdapter(),
        getVersion: () => versionRef.current,
        parent: isScope(outerRouter) ? outerRouter : undefined, // R4
      },
    )
    let unmounting = false
    created.on('dispose', () => {
      if (!unmounting) {
        onDisposeRef.current?.() // R3: self-disposal only
      }
    })
    setScope(created)
    return () => {
      unmounting = true
      created.dispose()
      setScope(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, name])

  const subscribe = useCallback((callback: () => void) => (scope ? scope.page.subscribe(callback) : () => {}), [scope])
  const page = useSyncExternalStore(subscribe, () => scope?.page.get() ?? null)

  const [resolved, setResolved] = useState<{ component: string; Component: ComponentType } | null>(null)
  const component = page?.component
  useEffect(() => {
    if (!component) {
      return
    }
    let stale = false
    const resolve: ResolveComponent =
      depsRef.current?.resolve ?? ((n) => router.resolveComponent(n) as Promise<ComponentType>)
    void resolve(component).then((Component) => {
      if (!stale) {
        setResolved({ component, Component })
      }
    })
    return () => {
      stale = true
    }
  }, [component])

  // R1: fallback until the first page AND the component for exactly that page
  // are in — a stale resolution keeps showing fallback, never a wrong component.
  if (!scope || !page || resolved?.component !== page.component) {
    return fallback
  }

  return (
    // D-11: the one sanctioned router cast — M08's contract test guarantees the shape.
    <RouterProvider value={scope as unknown as RouterSurface}>
      {/* ScopePage is a structural subset of core's Page; the adapter only
          reads fields both share (component, props, url, version, rescuedProps). */}
      <PageProvider value={page as unknown as Page}>
        <resolved.Component key={page.component} {...page.props} /> {/* R2 */}
      </PageProvider>
    </RouterProvider>
  )
}
