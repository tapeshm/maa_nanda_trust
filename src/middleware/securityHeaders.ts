// [D3:auth.step-02:security-middleware]
import type { MiddlewareHandler } from 'hono'
import { buildCsp } from '../config/csp'

const AUTH_PATH_RE = /^(\/login|\/logout|\/auth(?:\b|\/))/

export const securityHeaders = (): MiddlewareHandler => {
  return async (c, next) => {
    await next()

    const h = c.res.headers

    // HSTS: one year, include subdomains (preload optional; omitted by default)
    h.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains')
    // Basic hardening
    h.set('X-Content-Type-Options', 'nosniff')
    h.set('Referrer-Policy', 'strict-origin-when-cross-origin')
    h.set('Permissions-Policy', 'geolocation=(), microphone=(), camera=()')

    // Content Security Policy
    const csp = buildCsp(c)
    if (csp) h.set('Content-Security-Policy', csp)

    // Auth responses: no-store
    const url = new URL(c.req.url)
    if (AUTH_PATH_RE.test(url.pathname)) {
      h.set('Cache-Control', 'no-store')
      h.set('Pragma', 'no-cache')
      h.set('Expires', '0')
    }
  }
}

