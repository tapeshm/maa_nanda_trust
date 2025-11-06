// import type {
//   D1Database,
//   R2Bucket,
//   KVNamespace,
// } from '@cloudflare/workers-types'

/**
 * Bindings describes the environment variables and service bindings exposed to
 * the Worker. Keeping this typed ensures `c.env` access stays aligned with Wrangler bindings.
 */
export interface Bindings {
  DB: D1Database
  R2: R2Bucket
  KV: KVNamespace
  PAGES_CACHE: KVNamespace
}
