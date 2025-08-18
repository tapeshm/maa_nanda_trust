// import type {
//   D1Database,
//   R2Bucket,
//   KVNamespace,
// } from '@cloudflare/workers-types'

/**
 * Bindings describes the environment variables and service bindings exposed to
 * the Worker.  Each property must correspond to the names defined in
 * `wrangler.toml`.  Using explicit types helps ensure that `c.env` is
 * correctly typed when used with Hono【503742541464715†L149-L170】.
 */
export interface Bindings {
  /**
   * The primary D1 database used for structured storage.  Queries are
   * performed via prepared statements.
   */
  DB: D1Database

  /**
   * The R2 bucket used to store and retrieve media files.
   */
  R2: R2Bucket

  /**
   * Key‑value namespace for caching and runtime data.  Use small string values
   * here – large binary objects belong in R2.
   */
  KV: KVNamespace

  /**
   * Username for Basic Auth.  Must be configured as a secret or var via
   * Wrangler.
   */
  ADMIN_USERNAME: string

  /**
   * Password for Basic Auth.  Must be configured as a secret or var via
   * Wrangler.
   */
  ADMIN_PASSWORD: string

  /**
   * Shared secret used to authorise R2 operations when custom headers are
   * checked.  See the R2 documentation for an example of protecting R2
   * endpoints【839556421027750†L272-L341】.
   */
  AUTH_KEY_SECRET: string
}
