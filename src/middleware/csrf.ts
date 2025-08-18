import { csrf } from 'hono/csrf'
import type { MiddlewareHandler } from 'hono'

/**
 * Configure CSRF protection for all POST, PUT, DELETE and PATCH requests.  The
 * default behaviour compares the `Origin` header against the request URL
 *【827260761473227†L218-L246】.  You can pass additional options here to
 * restrict allowed origins or customise behaviour.
 */
export const csrfProtection: MiddlewareHandler = csrf()