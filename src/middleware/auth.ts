import { basicAuth } from 'hono/basic-auth'
import type { MiddlewareHandler } from 'hono'
import type { Bindings } from '../bindings'

/**
 * Middleware to protect administrative routes with HTTP Basic authentication.
 * Credentials are verified against environment variables rather than being
 * hardcoded.  This approach allows credentials to be rotated without code
 * changes【398093354732524†L220-L248】.
 *
 * Usage:
 *
 * ```ts
 * app.use('/admin/*', adminAuth)
 * ```
 */
export const adminAuth: MiddlewareHandler<{ Bindings: Bindings }> = basicAuth({
  verifyUser: (username, password, c) => {
    const env = c.env
    return username === env.ADMIN_USERNAME && password === env.ADMIN_PASSWORD
  },
})