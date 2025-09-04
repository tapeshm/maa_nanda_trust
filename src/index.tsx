/** @jsxImportSource hono/jsx */

import { Hono } from 'hono'
import type { Bindings } from './bindings'
import routes from './routes'
import { securityMiddleware } from './middleware/secure'
import { csrfProtection } from './middleware/csrf'
import Layout from './templates/layout'
import ErrorPage from './templates/error'

/**
 * Entry point for the Worker.  This file creates the Hono app,
 * applies global middlewares such as security headers and CSRF
 * protection, mounts the routes defined in `src/routes`, and defines
 * fallback handlers for 404 and error responses.
 */


const app = new Hono<{ Bindings: Bindings }>()

// Apply security headers to all responses.  This middleware sets
// Content‑Security‑Policy, Referrer‑Policy, X‑Frame‑Options and other
// recommended headers【212270213774445†L210-L222】.
app.use('*', securityMiddleware)

// Enable CSRF protection on all state‑changing HTTP methods.  The
// middleware verifies the Origin header for POST, PUT, DELETE and PATCH
// requests【827260761473227†L218-L246】.
app.use('*', csrfProtection)

// Mount our application routes at the root.  Routes are defined in
// `src/routes/index.ts` and include public content, finance, media and
// admin endpoints.
app.route('/', routes)

// 404 handler – render a friendly not found page
app.notFound((c) => {
  return c.html(
    <Layout title="Not Found">
      <ErrorPage message="The page you are looking for was not found." status={404} />
    </Layout>,
    404,
  )
})

// Error handler – log the error and render a generic error page
app.onError((err, c) => {
  console.error(err)
  return c.html(
    <Layout title="Server Error">
      <ErrorPage message="An unexpected error occurred." status={500} />
    </Layout>,
    500,
  )
})

export default app
