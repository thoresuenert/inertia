// Builds the request headers for one scope visit (Q1, Q2, docs/04-protocol.md).
// Order: standard Inertia → partial → scope → extra, so user-supplied
// `extra` headers are merged last and win.

export function buildHeaders(input: {
  version: string | null
  scopeName: string
  scopeUrl: string
  parentUrl: string
  partial?: { component: string; only: string[]; except: string[] }
  extra?: Record<string, string>
}): Record<string, string> {
  const headers: Record<string, string> = {
    'X-Requested-With': 'XMLHttpRequest',
    'X-Inertia': 'true',
    Accept: 'text/html, application/xhtml+xml',
  }

  if (input.version !== null) {
    headers['X-Inertia-Version'] = input.version
  }

  // Q2: partial headers only when something is actually requested partially.
  const partial = input.partial
  if (partial && (partial.only.length > 0 || partial.except.length > 0)) {
    headers['X-Inertia-Partial-Component'] = partial.component
    if (partial.only.length > 0) {
      headers['X-Inertia-Partial-Data'] = partial.only.join(',')
    }
    if (partial.except.length > 0) {
      headers['X-Inertia-Partial-Except'] = partial.except.join(',')
    }
  }

  headers['X-Inertia-Scope'] = input.scopeName
  headers['X-Inertia-Scope-Url'] = input.scopeUrl
  headers['X-Inertia-Scope-Parent-Url'] = input.parentUrl

  return { ...headers, ...input.extra }
}
