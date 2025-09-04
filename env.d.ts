/// <reference types="@cloudflare/workers-types" />
/// <reference types="@cloudflare/vitest-pool-workers" />
/// <reference types="vitest" />

import type { Bindings } from './src/bindings'

// Make Cloudflare's global `Env` match our app bindings
declare global {
  interface Env extends Bindings {}
}

// Tell the Workers Vitest pool what env it should provide in tests
declare module 'cloudflare:test' {
  interface ProvidedEnv extends Env {}
}

