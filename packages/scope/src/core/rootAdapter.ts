// The few root-router calls a scope needs (T6 push/replace/reload, P2
// hardVisit, L5 onNavigate). Both the router and the location are injected;
// real callers use the defaults, tests pass fakes.

import { router } from '@inertiajs/core'
import type { Page, Router } from '@inertiajs/core'
import type { ScopePage } from '../pure/types'

export type LocationLike = { readonly href: string; assign(url: string): void }

export type RootAdapter = {
  currentUrl(): string
  push(page: ScopePage): void
  replace(page: ScopePage): void
  reload(only: string[]): void
  onNavigate(cb: (url: string) => void): () => void
  hardVisit(url: string): void
}

export function createRootAdapter(r: Router = router, loc: LocationLike = window.location): RootAdapter {
  // T6: the root page behind a scope keeps its scroll and state.
  const toClientSideVisit = (page: ScopePage) => ({
    component: page.component,
    url: page.url,
    // Boundary cast: ScopePage.props is structurally a subset of core's Page['props'].
    props: page.props as Page['props'],
    flash: page.flash,
    preserveScroll: true,
    preserveState: true,
  })

  return {
    currentUrl: () => loc.href,
    push: (page) => r.push(toClientSideVisit(page)),
    replace: (page) => r.replace(toClientSideVisit(page)),
    reload: (only) => r.reload({ only }),
    onNavigate: (cb) => r.on('navigate', (event) => cb(event.detail.page.url)),
    hardVisit: (url) => loc.assign(url),
  }
}
