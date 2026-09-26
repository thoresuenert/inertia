// M00 smoke test: the package's public entry resolves and exports what it claims.
import { expect, it } from 'vitest'
import { SCOPE_POC } from '../src/index'

it('M00: package exports resolve', () => {
  expect(SCOPE_POC).toBe('scope-poc')
})
