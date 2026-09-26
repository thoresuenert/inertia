// URL helpers for scope visits. Implements U1 (resolve against the scope page
// URL, never window) and U2 (query merging). Trailing slash rule: samePath
// treats '/users/' and '/users' as equal; the root '/' stays as is.
// U2 deviation from core: null AND undefined both REMOVE a query key
// (core keeps `key=` for null) — decided in the M01 plan.

// U1: `base` is the scope page URL, passed in explicitly.
export function toUrl(href: string, base: string): URL {
  return new URL(href, base)
}

function normalizePath(pathname: string): string {
  return pathname.length > 1 && pathname.endsWith('/') ? pathname.slice(0, -1) : pathname
}

// Pathname comparison only — query and hash are ignored. Used by T2/T3.
export function samePath(a: string, b: string, base: string): boolean {
  return normalizePath(toUrl(a, base).pathname) === normalizePath(toUrl(b, base).pathname)
}

// T6 "URL equals": same pathname AND same query; hash ignored. The query is
// compared as a string, so parameter order matters — good enough for
// comparing server-generated URLs with themselves.
export function sameUrl(a: string, b: string, base: string): boolean {
  const urlA = toUrl(a, base)
  const urlB = toUrl(b, base)
  return normalizePath(urlA.pathname) === normalizePath(urlB.pathname) && urlA.search === urlB.search
}

// U2: merge `data` into the query string of `href`. Existing keys are
// overwritten (plain and `key[]` form), null/undefined remove the key,
// arrays serialize as `key[]=`, nested objects throw. Returns an absolute URL.
export function mergeQuery(href: string, data: Record<string, unknown>, base: string): string {
  const url = toUrl(href, base)
  const params = url.searchParams

  for (const [key, value] of Object.entries(data)) {
    params.delete(key)
    params.delete(`${key}[]`)

    if (value === null || value === undefined) {
      continue
    }

    if (Array.isArray(value)) {
      for (const item of value) {
        if (typeof item === 'object' && item !== null) {
          throw new Error(`mergeQuery: nested objects are not supported (key "${key}")`)
        }
        params.append(`${key}[]`, String(item))
      }
      continue
    }

    if (typeof value === 'object') {
      throw new Error(`mergeQuery: nested objects are not supported (key "${key}")`)
    }

    params.set(key, String(value))
  }

  return url.toString()
}
