import { Hono } from 'hono'
import type { Bindings } from '../bindings'
import Layout from '../templates/layout'
import LoginPage from '../templates/login'
import { supabaseAuth } from '../middleware/auth'
import { setCookie, deleteCookie } from 'hono/cookie'

const app = new Hono<{ Bindings: Bindings }>()

// Small helper to attach Supabase SSR client if env configured.
function supabaseAuthFromEnv(c: any, next: any) {
  const projectUrl = (c.env as any).SUPABASE_URL
  const publishableKey = (c.env as any).SUPABASE_PUBLISHABLE_KEY
  const jwksUri = (c.env as any).JWKS_URL
  const hmacJwtSecret = (c.env as any).SUPABASE_JWT_SECRET
  const expectedIssuerEnv = (c.env as any).SUPABASE_ISSUER as string | undefined
  if (!projectUrl || !publishableKey) return next()
  // Workaround for Supabase CLI: tokens often have iss http://127.0.0.1:54321/auth/v1
  // while the service is accessed via host.docker.internal inside Docker.
  let issuer = expectedIssuerEnv
  if (!issuer) {
    try {
      const u = new URL(projectUrl)
      issuer = `${u.origin}/auth/v1`
      if (hmacJwtSecret && u.hostname !== '127.0.0.1') {
        issuer = `http://127.0.0.1:${u.port || '54321'}/auth/v1`
      }
    } catch {}
  }
  return supabaseAuth({
    projectUrl,
    publishableKey,
    jwksUri,
    hmacJwtSecret,
    expected: issuer ? { issuer } : undefined,
  })(c, next)
}

// Render login form
app.get('/login', supabaseAuthFromEnv, (c) => {
  const auth = c.get('auth')
  if (auth?.userId) return c.redirect('/', 303)
  const url = new URL(c.req.url)
  const redirectTo = url.searchParams.get('redirect_to') || '/'
  return c.html(
    <Layout title="Log in">
      <LoginPage redirectTo={redirectTo} />
    </Layout>,
  )
})

// Handle login submission
app.post('/login', supabaseAuthFromEnv, async (c) => {
  const form = await c.req.parseBody()
  const email = String(form['email'] || '').trim()
  const password = String(form['password'] || '')
  const redirectTo = String(form['redirect_to'] || '/')

  try {
    const client = c.get('auth')?.getClient?.()
    if (!client) {
      return c.html(
        <Layout title="Log in">
          <LoginPage error={'Authentication is not configured for this environment'} email={email} redirectTo={redirectTo} />
        </Layout>,
        500,
      )
    }
    const { data, error } = await client.auth.signInWithPassword({ email, password })
    if (error || !data?.session) {
      return c.html(
        <Layout title="Log in">
          <LoginPage error={error?.message || 'Invalid credentials'} email={email} redirectTo={redirectTo} />
        </Layout>,
        401,
      )
    }
    // Set an HttpOnly access_token cookie for server-side verification
    const token = data.session.access_token
    setCookie(c, 'access_token', token, {
      httpOnly: true,
      secure: false, // development: allow http
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24, // 1 day
    })
    // SSR adapter has already set its own cookies; redirect to target
    return c.redirect(redirectTo || '/', 303)
  } catch (e: any) {
    return c.html(
      <Layout title="Log in">
        <LoginPage error={e?.message || 'Unexpected error'} email={email} redirectTo={redirectTo} />
      </Layout>,
      500,
    )
  }
})

// Log out and clear SSR cookies
app.post('/logout', supabaseAuthFromEnv, async (c) => {
  try {
    const client = c.get('auth')?.getClient?.()
    if (client) await client.auth.signOut()
  } catch {}
  // Clear our access_token cookie
  deleteCookie(c, 'access_token', { path: '/' })
  return c.redirect('/', 303)
})

// Allow GET /logout for convenience from simple links
app.get('/logout', supabaseAuthFromEnv, async (c) => {
  try {
    const client = c.get('auth')?.getClient?.()
    if (client) await client.auth.signOut()
  } catch {}
  deleteCookie(c, 'access_token', { path: '/' })
  return c.redirect('/', 303)
})

export default app
