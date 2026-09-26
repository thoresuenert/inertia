import { Router, router } from '@inertiajs/core'
import { createContext } from 'react'

export type RouterSurface = Pick<
  Router,
  | 'on'
  | 'visit'
  | 'get'
  | 'post'
  | 'put'
  | 'patch'
  | 'delete'
  | 'reload'
  | 'poll'
  | 'remember'
  | 'restore'
  | 'prefetch'
  | 'getCached'
  | 'getPrefetching'
  | 'flush'
>

const routerContext = createContext<RouterSurface>(router)
routerContext.displayName = 'InertiaRouterContext'

export default routerContext
