/** @jsxImportSource hono/jsx */
import { Hono } from 'hono'
import type { Bindings } from '../bindings'
import { exchangeLogin, type LoginCredentials, SupabaseAuthError } from '../auth/supabaseTokens'
import { setAccessCookie, setRefreshCookie } from '../auth/cookies'
import Layout from '../templates/layout'
import LoginPage from '../templates/login'
import { ensureCsrf, issueCsrf, getCsrfParsedBody } from '../middleware/csrf'
import { isHtmx } from '../utils/request'
import { logger } from '../observability/logger'
import { getCorrelationId } from '../observability/authLogs'

const login = new Hono<{ Bindings: Bindings }>()

function getFirstCandidate(...values: Array<string | null | undefined>): string | null {
  for (const value of values) {
    if (typeof value === 'string' && value.trim().length > 0) {
      return value
    }
  }
  return null
}

function sanitizeRedirect(target: string | null, requestUrl: string): string {
  const fallback = '/'
  if (!target) return fallback
  try {
    const base = new URL(requestUrl)
    const resolved = new URL(target, base)
    if (resolved.origin !== base.origin) return fallback
    if (!resolved.pathname.startsWith('/')) return fallback
    return `${resolved.pathname}${resolved.search}${resolved.hash}` || fallback
  } catch {
    return fallback
  }
}

function maskIdentifier(value: string): string {
  if (!value) return ''
  const at = value.indexOf('@')
  if (at === -1) {
    if (value.length <= 3) return '*'.repeat(value.length)
    return `${value[0]}***${value[value.length - 1]}`
  }
  const local = value.slice(0, at)
  const domain = value.slice(at + 1)
  if (!local) return `*@${domain}`
  if (local.length <= 2) {
    const first = local[0] ?? '*'
    return `${first}***@${domain}`
  }
  return `${local[0]}***${local[local.length - 1]}@${domain}`
}

// Render the login form
login.get('/login', (c) => {
  const url = new URL(c.req.url)
  const errorParam = url.searchParams.get('error')
  const error = errorParam ? 'Authentication failed. Please try again.' : null
  const redirectCandidate = getFirstCandidate(url.searchParams.get('redirect'), url.searchParams.get('redirect_to'))
  const redirectTo = sanitizeRedirect(redirectCandidate, c.req.url)
  const csrfToken = ensureCsrf(c)
  return c.html(
    <Layout title="Login" csrfToken={csrfToken}>
      <LoginPage error={error} redirectTo={redirectTo} csrfToken={csrfToken} />
    </Layout>,
  )
})

login.post('/login', async (c) => {
  const contentType = c.req.header('Content-Type') || ''
  let creds: LoginCredentials
  let redirectCandidate: string | null = null
  const cachedBody = getCsrfParsedBody<any>(c)
  if (contentType.includes('application/json')) {
    const body = cachedBody ??
      (await c.req.json<{ email?: string; password?: string; redirect?: string; redirect_to?: string; redirectTo?: string }>())
    creds = { email: body.email || '', password: body.password || '' }
    redirectCandidate = getFirstCandidate(body.redirect, body.redirect_to, body.redirectTo)
  } else {
    const form = cachedBody ?? (await c.req.parseBody())
    const email = typeof form['email'] === 'string' ? (form['email'] as string) : ''
    const password = typeof form['password'] === 'string' ? (form['password'] as string) : ''
    creds = { email, password }
    const formRedirect = typeof form['redirect_to'] === 'string' ? (form['redirect_to'] as string) : null
    redirectCandidate = getFirstCandidate(formRedirect)
  }

  if (!creds.email || !creds.password) {
    return c.json({ ok: false, error: 'missing_credentials' }, 400)
  }

  const queryRedirect = getFirstCandidate(c.req.query('redirect') as string | undefined, c.req.query('redirect_to') as string | undefined)
  const redirectTo = sanitizeRedirect(redirectCandidate ?? queryRedirect, c.req.url)
  const rid = getCorrelationId(c as any)
  const maskedEmail = maskIdentifier(creds.email)
  logger.info('auth.login.attempt', { rid, email: maskedEmail, htmx: isHtmx(c), redirectTo })

  try {
    const { access_token, refresh_token } = await exchangeLogin(c.env, creds)
    // Set cookies (flags enforced by helpers)
    setAccessCookie(c, access_token)
    setRefreshCookie(c, refresh_token)
    // Issue CSRF token for state-changing routes
    issueCsrf(c)

    logger.info('auth.login.success', { rid, email: maskedEmail })

    if (isHtmx(c)) {
      return c.json({ ok: true })
    }
    return c.redirect(redirectTo, 302)
  } catch (err: any) {
    const isSupabaseError = err instanceof SupabaseAuthError
    logger.warn('auth.login.failed', {
      rid,
      email: maskedEmail,
      status: isSupabaseError ? err.status : undefined,
      code: isSupabaseError ? err.code : undefined,
      category: isSupabaseError ? err.category : undefined,
      reason: err?.message,
    })
    // Do not log token contents; return generic error
    if (isHtmx(c)) {
      return c.json({ ok: false, error: 'login_failed' }, 401)
    }
    return c.redirect('/login?error=1', 302)
  }
})

export default login
