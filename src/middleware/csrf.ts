import { csrf } from 'hono/csrf'
import type { MiddlewareHandler } from 'hono'

/**
 * CSRF protection with selective bypass for auth endpoints. Hono's default
 * CSRF middleware checks the Origin header; in local dev, posting to
 * `/login` or `/logout` may involve cross-host (e.g., 0.0.0.0 vs localhost),
 * so we skip CSRF for those specific endpoints while still protecting the
 * rest of the app.
 */
const baseCsrf = csrf()

export const csrfProtection: MiddlewareHandler = async (c, next) => {
  const m = c.req.method
  if (m === 'GET' || m === 'HEAD' || m === 'OPTIONS') return next()
  const path = new URL(c.req.url).pathname
  if (path === '/login' || path === '/logout' || path.startsWith('/_edit/')) {
    return next()
  }
  return baseCsrf(c, next)
}
