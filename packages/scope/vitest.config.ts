// Vitest config for @inertiajs-poc/scope. Node environment by default;
// React tests (M08+) opt into jsdom per file via `// @vitest-environment jsdom`.
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx'],
  },
})
