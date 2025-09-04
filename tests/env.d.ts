/// <reference path="../env.d.ts" />

import type { D1Migration } from '@cloudflare/vitest-pool-workers/config'

declare module 'cloudflare:test' {
  // Augment the ProvidedEnv to include test-only binding for migrations
  interface ProvidedEnv {
    TEST_MIGRATIONS: D1Migration[]
  }
}

export {}
