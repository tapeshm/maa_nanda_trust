import type { MiddlewareHandler } from 'hono'
import { getTrustedOrigins } from '../utils/env'
import { HEADER_HX_REQUEST } from '../utils/constants'

export function corsForAuth(getEnv: (c: any) => Record<string, any>): MiddlewareHandler {
  return async (c, next) => {
    const env = getEnv(c)
    const origins = getTrustedOrigins(env)
    const origin = c.req.header('origin')
    const method = c.req.method.toUpperCase()
    const reqOrigin = new URL(c.req.url).origin

    // Always allow same-origin requests (CORS is a cross-origin protection)
    if (origin && origin === reqOrigin) {
      return next()
    }

    // Preflight
    if (method === 'OPTIONS') {
      if (origin && origins.includes(origin)) {
        c.header('Access-Control-Allow-Origin', origin)
        c.header('Vary', 'Origin')
        c.header('Access-Control-Allow-Credentials', 'true')
        c.header('Access-Control-Allow-Headers', `Content-Type, X-Requested-With, ${HEADER_HX_REQUEST}, X-CSRF-Token`)
        c.header('Access-Control-Allow-Methods', 'POST, GET, OPTIONS')
        return c.body(null, 204)
      }
      // Disallow credentialed preflights from unknown origins
      return c.text('CORS origin not allowed', 403)
    }

    // Simple/actual request
    if (origin && origins.includes(origin)) {
      c.header('Access-Control-Allow-Origin', origin)
      c.header('Vary', 'Origin')
      c.header('Access-Control-Allow-Credentials', 'true')
      return next()
    }

    // If no origin, treat as same-origin (e.g., form POST). Otherwise, reject.
    if (!origin) return next()
    return c.text('CORS origin not allowed', 403)
  }
}
