/** @jsxImportSource hono/jsx */

import { Hono } from 'hono'
import type { Bindings } from './bindings'
import routes from './routes'
import loginRoutes from './routes/login'
import logoutRoutes from './routes/logout'
import { securityHeaders } from './middleware/securityHeaders'
import { attachAuthContext } from './middleware/auth'
import { corsForAuth } from './middleware/cors'
import { rateLimit } from './middleware/rateLimit'
import { csrfProtect, ensureCsrf } from './middleware/csrf'
import Layout from './templates/layout'
import ErrorPage from './templates/error'

/**
 * Entry point for the Worker.  This file creates the Hono app,
 * applies global middlewares such as security headers and CSRF
 * protection, mounts the routes defined in `src/routes`, and defines
 * fallback handlers for 404 and error responses.
 */


const app = new Hono<{ Bindings: Bindings }>()

// Apply security headers to all responses (CSP, HSTS, etc.)
app.use('*', securityHeaders())

// Enforce CSRF protection for state-changing verbs
app.use('*', csrfProtect())

// Attach auth context for all requests so Layout can reflect signed-in state
app.use('*', (c, next) => {
  const env = c.env as any
  const supaUrl = env?.SUPABASE_URL as string | undefined
  let issuer: string | undefined
  if (supaUrl) {
    try {
      const u = new URL(supaUrl)
      const host = u.hostname
      const hasHs256 = !!env?.SUPABASE_JWT_SECRET || String(env?.DEV_SUPABASE_LOCAL ?? '0') === '1'
      if (hasHs256 && !['127.0.0.1', 'localhost'].includes(host)) {
        u.hostname = '127.0.0.1'
      }
      issuer = `${u.origin}/auth/v1`
    } catch {}
  }
  return attachAuthContext(issuer ? { expected: { issuer } } : undefined)(c, next)
})

// Auth endpoint protections
const getEnv = (c: any) => c.env as any
app.use('/login', corsForAuth(getEnv))
app.use('/logout', corsForAuth(getEnv))
app.use('/login', rateLimit(getEnv))
app.use('/logout', rateLimit(getEnv))

// Mount auth/login routes before content catch-all to avoid 404s
app.route('/', loginRoutes)
app.route('/', logoutRoutes)
app.route('/', routes)


// 404 handler – render a friendly not found page
app.notFound((c) => {
  const csrfToken = ensureCsrf(c)
  return c.html(
    <Layout title="Not Found" csrfToken={csrfToken}>
      <ErrorPage message="The page you are looking for was not found." status={404} />
    </Layout>,
    404,
  )
})

// Error handler – log the error and render a generic error page
app.onError((err, c) => {
  console.error(err)
  const csrfToken = ensureCsrf(c)
  return c.html(
    <Layout title="Server Error" csrfToken={csrfToken}>
      <ErrorPage message="An unexpected error occurred." status={500} />
    </Layout>,
    500,
  )
})

export default app
