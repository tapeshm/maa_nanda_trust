import type { Context, MiddlewareHandler } from 'hono'
import { getCookie, setCookie } from 'hono/cookie'

export const CSRF_COOKIE_NAME = '__Host-csrf'
const CSRF_CACHE_KEY = 'csrf:body'
const TOKEN_FIELDS = ['csrf_token', '_csrf'] as const

function randomToken(): string {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export function issueCsrf(c: Context | any): string {
  const token = randomToken()
  setCookie(c, CSRF_COOKIE_NAME, token, {
    path: '/',
    httpOnly: false,
    secure: true,
    sameSite: 'Lax',
    maxAge: 60 * 60 * 8, // 8 hours
  })
  return token
}

export function ensureCsrf(c: Context | any): string {
  const existing = getCookie(c, CSRF_COOKIE_NAME)
  if (typeof existing === 'string' && existing.length > 0) {
    return existing
  }
  return issueCsrf(c)
}

function isStateChanging(method: string): boolean {
  return ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)
}

function cacheBody(c: Context, body: unknown) {
  try {
    c.set(CSRF_CACHE_KEY, body)
  } catch {
    /* no-op */
  }
}

function getCachedBody<T = any>(c: Context): T | undefined {
  try {
    return c.get(CSRF_CACHE_KEY)
  } catch {
    return undefined
  }
}

function extractTokenFromBody(body: any): string | undefined {
  if (!body || typeof body !== 'object') return undefined
  for (const field of TOKEN_FIELDS) {
    const value = body[field]
    if (typeof value === 'string' && value.length > 0) {
      return value
    }
  }
  return undefined
}

async function readBodyForCsrf(c: Context): Promise<{ token?: string; body?: any }> {
  const cached = getCachedBody(c)
  if (cached !== undefined) {
    return { token: extractTokenFromBody(cached), body: cached }
  }

  const contentType = c.req.header('Content-Type') || ''

  if (contentType.includes('application/json')) {
    try {
      const body = await c.req.json()
      cacheBody(c, body)
      return { token: extractTokenFromBody(body), body }
    } catch {
      cacheBody(c, null)
      return {}
    }
  }

  if (contentType.includes('application/x-www-form-urlencoded') || contentType.includes('multipart/form-data')) {
    try {
      const body = await c.req.parseBody()
      cacheBody(c, body)
      return { token: extractTokenFromBody(body), body }
    } catch {
      cacheBody(c, null)
      return {}
    }
  }

  cacheBody(c, null)
  return {}
}

function extractTokenFromQuery(c: Context): string | undefined {
  for (const field of TOKEN_FIELDS) {
    const value = c.req.query(field)
    if (typeof value === 'string' && value.length > 0) {
      return value
    }
  }
  return undefined
}

function tokensMatch(expected: string | undefined, actual: string | undefined): boolean {
  return typeof expected === 'string' && expected.length > 0 && expected === actual
}

export function getCsrfParsedBody<T = any>(c: Context): T | undefined {
  return getCachedBody<T>(c)
}

export function csrfProtect(): MiddlewareHandler {
  return async (c, next) => {
    const method = c.req.method.toUpperCase()
    if (!isStateChanging(method)) return next()

    const cookieToken = getCookie(c, CSRF_COOKIE_NAME)
    if (!cookieToken) {
      return c.text('Forbidden', 403)
    }

    const headerToken = c.req.header('X-CSRF-Token') || c.req.header('HX-CSRF-Token') || undefined
    if (tokensMatch(cookieToken, headerToken)) {
      return next()
    }

    const queryToken = extractTokenFromQuery(c)
    if (tokensMatch(cookieToken, queryToken)) {
      return next()
    }

    const { token: bodyToken } = await readBodyForCsrf(c)
    if (tokensMatch(cookieToken, bodyToken)) {
      return next()
    }

    return c.text('Forbidden', 403)
  }
}
