import { config as coreConfig } from '@inertiajs/core'
import PageContext from './PageContext'
import RouterContext from './RouterContext'
import type { ReactInertiaAppConfig } from './types'

export { http, progress, router } from '@inertiajs/core'
export { default as App } from './App'
export { default as createInertiaApp } from './createInertiaApp'
export { default as Deferred } from './Deferred'
export { default as Form, useFormContext } from './Form'
export { default as Head } from './Head'
export { default as InfiniteScroll } from './InfiniteScroll'
export { resetLayoutProps, setLayoutProps } from './layoutProps'
export { InertiaLinkProps, default as Link } from './Link'
export { LayoutCallback, ReactComponent as ResolvedComponent } from './types'
export {
  InertiaForm,
  InertiaFormProps,
  InertiaPrecognitiveFormProps,
  SetDataAction,
  SetDataByKeyValuePair,
  SetDataByMethod,
  SetDataByObject,
  default as useForm,
} from './useForm'
export { RouterSurface } from './RouterContext'
export { default as useHttp } from './useHttp'
export { default as usePage } from './usePage'
export { default as usePoll } from './usePoll'
export { default as usePrefetch } from './usePrefetch'
export { default as useRemember } from './useRemember'
export { default as useRouter } from './useRouter'
export { default as WhenMounted } from './WhenMounted'
export { default as WhenVisible } from './WhenVisible'

export const RouterProvider = RouterContext.Provider
export const PageProvider = PageContext.Provider

export const config = coreConfig.extend<ReactInertiaAppConfig>()
