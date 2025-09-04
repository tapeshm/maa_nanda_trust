import type { Context } from 'hono'
import { setCookie, deleteCookie } from 'hono/cookie'
import type { JWTPayload } from 'jose'
import { createServerClient, type CookieOptions, parseCookieHeader, combineChunks } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'
import { createJwksVerifier } from './verify/jwks'
import { createHmacVerifier } from './verify/hmac'
import type { TokenVerifier } from './verify/types'
import { selectCacheAdapter, getAuthMode, type AuthRuntimeMode } from './env'
import { trimSlash, decodeB64, extractRolesFromClaims, isDebug, type MiddlewareHandler } from './helpers'

export type SupabaseAuthOptions = {
  projectUrl: string
  publishableKey: string
  jwksUri?: string
  projectRef?: string
  hmacJwtSecret?: string
  tokenSources?: { cookieSsrAuthName?: string }
  cookieOptions?: CookieOptions
  expected?: { issuer?: string; audience?: 'authenticated' }
}

type CookieItem = { name: string; value: string; options?: CookieOptions }

declare module 'hono' {
  interface ContextVariableMap {
    auth: {
      token: string | null
      claims: (JWTPayload & { role?: string; email?: string }) | null
      userId: string | null
      getClient: () => SupabaseClient
    }
  }
}

export function supabaseAuth(options: SupabaseAuthOptions): MiddlewareHandler {
  const { projectUrl, publishableKey, projectRef, jwksUri = `${trimSlash(projectUrl)}/auth/v1/.well-known/jwks.json`, hmacJwtSecret, tokenSources, cookieOptions, expected } = options

  const projectRefDerived = projectRef || new URL(projectUrl).hostname.split('.')[0]
  const cookieSsrAuthName = tokenSources?.cookieSsrAuthName ?? `sb-${projectRefDerived}-auth-token`
  const expectedIssuer = expected?.issuer ?? `${trimSlash(projectUrl)}/auth/v1`

  return async (c, next) => {
    const mode: AuthRuntimeMode = getAuthMode(c)
    if (isDebug(c)) console.log('[auth] mode:', mode)
    const cache = selectCacheAdapter(c, mode)

    let verifier: TokenVerifier
    if (mode === 'production') {
      // In production, always use JWKS verification
      verifier = createJwksVerifier({ jwksUrl: jwksUri, cache, expectedIssuer, expectedAudience: expected?.audience })
    } else if (hmacJwtSecret) {
      // Local/test: prefer HMAC when secret is available
      verifier = createHmacVerifier({ secret: hmacJwtSecret, expectedIssuer, expectedAudience: expected?.audience })
    } else {
      // Local/test without secret: fall back to JWKS
      verifier = createJwksVerifier({ jwksUrl: jwksUri, cache, expectedIssuer, expectedAudience: expected?.audience })
    }

    // Minimal cookie adapter: ignore per-call options from Supabase and use
    // a stable set of options we control (simpler and type-safe).
    const isProd = mode === 'production'
    const baseCookieOptions: CookieOptions = {
      httpOnly: isProd,
      secure: isProd,
      sameSite: 'lax',
      path: '/',
      ...(cookieOptions || {}),
    }

    const cookiesAdapter = {
      getAll(): CookieItem[] {
        const raw = c.req.raw.headers.get('cookie')
        if (!raw) return []
        return parseCookieHeader(raw).map(({ name, value }) => ({ name, value: value ?? '' }))
      },
      setAll(toSet: CookieItem[]) {
        for (const { name, value, options } of toSet) {
          const merged = { ...baseCookieOptions, ...(options || {}) }
          setCookie(c, name, value, merged)
        }
      },
      removeAll(toRemove: CookieItem[]) {
        for (const { name, options } of toRemove) {
          const merged = { ...baseCookieOptions, ...(options || {}) }
          deleteCookie(c, name, merged)
        }
      },
    }

    let clientCache: SupabaseClient | null = null
    const getClient = () => {
      if (clientCache) return clientCache
      if (isDebug(c)) console.log('[auth] creating Supabase SSR client with cookieOptions:', { ...baseCookieOptions, name: cookieSsrAuthName })
      clientCache = createServerClient(projectUrl, publishableKey, {
        cookies: cookiesAdapter,
        cookieOptions: { name: cookieSsrAuthName, ...baseCookieOptions },
      })
      return clientCache
    }

    // 1) Read token from SSR cookie only
    let token: string | null = await readAccessTokenFromSsrCookie(c, cookieSsrAuthName)
    if (isDebug(c)) console.log('[auth] initial SSR token present:', !!token)
    let claims: (JWTPayload & { role?: string; email?: string }) | null = null
    let userId: string | null = null

    // 2) Verify existing token
    if (token) {
      try {
        const { payload } = await verifier.verify(token)
        claims = payload as typeof claims
        userId = typeof payload.sub === 'string' ? payload.sub : null
        if (isDebug(c)) console.log('[auth] SSR token verified: userId=', userId)
      } catch {
        if (isDebug(c)) console.log('[auth] SSR token verify failed; will try refresh path')
        token = null
      }
    }

    // 3) Refresh via Supabase client when needed
    if (!token) {
      const client = getClient()
      const { data: { user } } = await client.auth.getUser()
      if (isDebug(c)) console.log('[auth] refresh: getUser ->', user ? 'present' : 'null')
      if (user) {
        const { data: { session } } = await client.auth.getSession()
        if (isDebug(c)) console.log('[auth] refresh: getSession ->', session?.access_token ? 'has token' : 'no token')
        if (session?.access_token) {
          token = session.access_token
          try {
            const { payload } = await verifier.verify(token)
            claims = payload as typeof claims
            userId = typeof payload.sub === 'string' ? payload.sub : null
            if (isDebug(c)) console.log('[auth] refresh token verified: userId=', userId)
          } catch {
            if (mode !== 'production') {
              try {
                const [, p] = token.split('.')
                const payload = JSON.parse(decodeB64(p)) as JWTPayload & { role?: string; email?: string }
                claims = payload
                userId = typeof payload.sub === 'string' ? payload.sub : null
                if (isDebug(c)) console.log('[auth] refresh verify failed; used payload fallback: userId=', userId)
              } catch {
                if (isDebug(c)) console.log('[auth] refresh payload fallback failed; clearing auth')
                token = null; claims = null; userId = null
              }
            } else {
              if (isDebug(c)) console.log('[auth] production mode: refresh verify failed; clearing auth')
              token = null; claims = null; userId = null
            }
          }
        }
      }
    }

    if (isDebug(c)) console.log('[auth] final auth state:', { hasToken: !!token, userId, hasClaims: !!claims })
    if (isDebug(c)) {
      try {
        const roles = Array.from(extractRolesFromClaims(claims))
        console.log('[auth] roles from claims:', roles)
      } catch {}
    }
    c.set('auth', { token, claims, userId, getClient })
    await next()
  }
}

export { trimSlash, decodeB64, extractRolesFromClaims, isDebug } from './helpers'

export async function readAccessTokenFromSsrCookie(c: Context, cookieSsrAuthName: string): Promise<string | null> {
  const raw = c.req.raw.headers.get('cookie')
  const allCookies = raw ? parseCookieHeader(raw) : []
  if (isDebug(c)) console.log('[auth] cookies present:', allCookies.map((c) => c.name))
  const byName = new Map(allCookies.map(({ name, value }) => [name, value ?? '']))
  const combined = await combineChunks(cookieSsrAuthName, (name: string) => byName.get(name))
  if (isDebug(c)) console.log('[auth] combined SSR cookie value present:', !!combined)
  if (!combined) return null

  const BASE64_PREFIX = 'base64-'
  let payload = combined
  if (payload.startsWith(BASE64_PREFIX)) payload = decodeB64(payload.slice(BASE64_PREFIX.length))

  try {
    const json = JSON.parse(payload)
    if (isDebug(c)) console.log('[auth] parsed SSR cookie JSON keys:', Object.keys(json || {}))
    if (typeof json?.access_token === 'string') return json.access_token
    if (typeof json?.currentSession?.access_token === 'string') return json.currentSession.access_token
    return null
  } catch {
    if (isDebug(c)) console.log('[auth] failed to parse SSR cookie JSON')
    return null
  }
}

export const requireAdmin: MiddlewareHandler = async (c, next) => {
  const auth = c.get('auth')
  if (!auth?.userId) return c.text('Unauthorized', 401)
  const roles = extractRolesFromClaims(auth.claims)
  if (roles.has('trustee') || roles.has('admin')) return next()
  return c.text('Forbidden', 403)
}

export const requireTrustee: MiddlewareHandler = async (c, next) => {
  const auth = c.get('auth')
  if (!auth?.userId) return c.text('Unauthorized', 401)
  const roles = extractRolesFromClaims(auth.claims)
  if (roles.has('trustee')) return next()
  return c.text('Forbidden', 403)
}

export function requireAnyRole(allowed: string[]): MiddlewareHandler {
  const allowedSet = new Set(allowed.map((r) => r.toLowerCase()))
  return async (c, next) => {
    const auth = c.get('auth')
    if (!auth?.userId) return c.text('Unauthorized', 401)
    const roles = extractRolesFromClaims(auth.claims)
    for (const r of roles) if (allowedSet.has(r)) return next()
    return c.text('Forbidden', 403)
  }
}
