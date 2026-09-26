import { use } from 'react'
import RouterContext, { RouterSurface } from './RouterContext'

export default function useRouter(): RouterSurface {
  return use(RouterContext)
}
