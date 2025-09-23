// [D3:auth.step-07:require-auth]
import type { MiddlewareHandler } from 'hono'
import { isHtmx } from '../utils/request'
import { HEADER_HX_REDIRECT } from '../utils/constants'
import { getCookie } from 'hono/cookie'
import { setAccessCookie, setRefreshCookie, clearAllAuthCookies } from '../auth/cookies'
import { ACCESS_COOKIE_NAME, REFRESH_COOKIE_NAME } from '../utils/constants'
import { verifyAccessJwt } from '../auth/verify'
import { refreshAccess, SupabaseAuthError } from '../auth/supabaseTokens'
import { logAuthEvent } from '../observability/authLogs'

function unauth(c: Parameters<MiddlewareHandler>[0]) {
  if (isHtmx(c)) {
    c.header(HEADER_HX_REDIRECT, '/login')
    return c.json({ ok: false, error: 'unauthorized' }, 401)
  }
  if (c.req.method === 'GET') {
    return c.redirect('/login', 302)
  }
  return c.json({ ok: false, error: 'unauthorized' }, 401)
}

export const requireAuth = (): MiddlewareHandler => {
  return async (c, next) => {
    const resolveIssuerFromEnv = (env: Record<string, unknown> | undefined): string | undefined => {
      try {
        const supaUrlRaw = env?.SUPABASE_URL
        if (!supaUrlRaw || typeof supaUrlRaw !== 'string') return undefined
        const u = new URL(supaUrlRaw)
        const host = u.hostname
        const devLocal = String(env?.DEV_SUPABASE_LOCAL ?? '0') === '1'
        const localHosts = ['127.0.0.1', 'localhost', 'host.docker.internal', '0.0.0.0']
        if (devLocal && localHosts.includes(host)) {
          u.hostname = '127.0.0.1'
        }
        return `${u.origin}/auth/v1`
      } catch {
        return undefined
      }
    }

    const expectedIssuer = resolveIssuerFromEnv(c.env as any)
    const envOverride = expectedIssuer
      ? ({ ...(c.env as any), AUTH_JWT_ISS: expectedIssuer } as any)
      : ((c.env as any) as any)
    let refreshed = false
    // Only accept cookies for app authorization; ignore Authorization header or query params
    let token = getCookie(c, ACCESS_COOKIE_NAME)
    const attemptRefresh = async (required: boolean): Promise<Response | undefined> => {
      if (refreshed) return undefined
      const refresh = getCookie(c, REFRESH_COOKIE_NAME)
      if (!refresh) return required ? unauth(c) : undefined
      try {
        const pair = await refreshAccess(c.env, refresh)
        const newClaims = await verifyAccessJwt(pair.access_token, envOverride)
        setAccessCookie(c, pair.access_token)
        setRefreshCookie(c, pair.refresh_token)
        token = pair.access_token
        try {
          const uid = (newClaims as any)?.sub || (newClaims as any)?.user_id || (newClaims as any)?.id || null
          c.set('auth', { token: pair.access_token, claims: newClaims as any, userId: uid ? String(uid) : null })
        } catch {
          /* no-op */
        }
        logAuthEvent(c as any, 'auth.refresh_ok')
        refreshed = true
        return undefined
      } catch (err: any) {
        if (err instanceof SupabaseAuthError) {
          if (err.category === 'invalid_or_revoked_family') {
            clearAllAuthCookies(c)
            logAuthEvent(c as any, 'auth.refresh_invalid_grant')
            return unauth(c)
          }
          if (err.category === 'invalid_grant_already_used') {
            // parallel refresh race - unauth without clearing
            logAuthEvent(c as any, 'auth.refresh_used')
            return unauth(c)
          }
          if (err.retryable || (err.status >= 500 && err.status < 600)) {
            logAuthEvent(c as any, 'auth.refresh_5xx')
            if (isHtmx(c)) {
              return c.json({ ok: false, error: 'auth_unavailable' }, 503)
            }
            return c.text('Authentication temporarily unavailable', 503)
          }
        }
        return unauth(c)
      }
    }

    if (!token) {
      const res = await attemptRefresh(true)
      if (res) return res
      return next()
    }

    try {
      const claims = await verifyAccessJwt(token, envOverride)
      try {
        const prev = (c.get('auth') as any) || { token: null, claims: null, userId: null }
        const uid = (claims as any)?.sub || (claims as any)?.user_id || (claims as any)?.id || null
        c.set('auth', { ...prev, token, claims, userId: uid ? String(uid) : null })
      } catch {
        /* no-op */
      }
      logAuthEvent(c as any, 'auth.verify_ok')
      const now = Math.floor(Date.now() / 1000)
      const near = (claims.exp ?? 0) - now <= 60
      if (near) {
        try {
          const prev = (c.get('auth') as any) || { token: null, claims: null, userId: null }
          c.set('auth', { ...prev, token, claims, userId: (prev?.userId as any) ?? (claims as any)?.sub ?? null, nearExpiry: true } as any)
        } catch {
          /* no-op */
        }
        const res = await attemptRefresh(false)
        if (res) return res
      }
      return next()
    } catch (e: any) {
      const name = (e?.code || e?.name || '') as string
      if (String(name).includes('JWTExpired')) logAuthEvent(c as any, 'auth.expired')
      else if (String(name).includes('ERR_JWKS_NO_MATCHING_KEY')) logAuthEvent(c as any, 'auth.jwks_miss')
      else logAuthEvent(c as any, 'auth.sig_fail')
      // On verify failure (e.g., expired), attempt exactly one refresh
      const res = await attemptRefresh(true)
      if (res) return res
      return next()
    }
  }
}

// Back-compat no-op exports to avoid breaking existing routes before step-07
type SupabaseAuthOpts = {
  expected?: {
    issuer?: string
  }
}

export function attachAuthContext(_opts?: SupabaseAuthOpts): MiddlewareHandler {
  return async (c, next) => {
    const existing = c.get('auth') as any
    if (existing && typeof existing === 'object' && existing.token) {
      return next()
    }

    const unauth = {
      token: null as string | null,
      claims: null as any,
      userId: null as string | null,
      getClient: () => {
        throw new Error('Supabase client not configured')
      },
    }

    const token = getCookie(c, ACCESS_COOKIE_NAME)
    if (!token) {
      if (!existing) c.set('auth', unauth)
      return next()
    }

    try {
      const envOverride = {
        ...(c.env as any),
        ...(typeof _opts?.expected?.issuer === 'string' && _opts.expected.issuer
          ? { AUTH_JWT_ISS: _opts.expected.issuer }
          : {}),
      }
      const claims = await verifyAccessJwt(token, envOverride as any)
      const anyClaims = claims as any
      const uid = anyClaims?.sub || anyClaims?.user_id || anyClaims?.id || null
      c.set('auth', { ...unauth, token, claims, userId: uid ? String(uid) : null })
    } catch {
      c.set('auth', unauth)
    }
    return next()
  }
}

export function extractRolesFromClaims(_claims: unknown): Set<string> {
  const roles = new Set<string>()
  const c = _claims as any
  if (!c || typeof c !== 'object') return roles
  const sources: unknown[] = []
  if (Array.isArray(c.roles)) sources.push(c.roles)
  if (Array.isArray(c.app_roles)) sources.push(c.app_roles)
  if (typeof c.role === 'string') sources.push(c.role)
  if (typeof c.roles === 'string') sources.push(c.roles)
  if (typeof c.app_roles === 'string') sources.push(c.app_roles)
  const meta = (c.app_metadata as any) || (c.user_metadata as any)
  if (meta && typeof meta === 'object') {
    if (Array.isArray(meta.roles)) sources.push(meta.roles)
    if (typeof meta.roles === 'string') sources.push(meta.roles)
    if (Array.isArray(meta.app_roles)) sources.push(meta.app_roles)
    if (typeof meta.app_roles === 'string') sources.push(meta.app_roles)
  }

  const add = (v: string) => {
    const parts = v.split(/[,\s]+/).map((x) => x.trim()).filter(Boolean)
    for (const p of parts) roles.add(p.toLowerCase())
  }
  for (const s of sources) {
    if (Array.isArray(s)) {
      for (const item of s) if (typeof item === 'string') add(item)
    } else if (typeof s === 'string') {
      add(s)
    }
  }
  return roles
}

function forbidden(c: Parameters<MiddlewareHandler>[0]) {
  if (isHtmx(c)) return c.json({ ok: false, error: 'forbidden' }, 403)
  if (c.req.method === 'GET') return c.redirect('/', 302)
  return c.json({ ok: false, error: 'forbidden' }, 403)
}

export const requireAdmin: MiddlewareHandler = async (c, next) => {
  const claims = (c.get('auth') as any)?.claims
  const roles = extractRolesFromClaims(claims)
  if (!roles.has('admin')) return forbidden(c)
  return next()
}

export const requireTrustee: MiddlewareHandler = async (c, next) => {
  const claims = (c.get('auth') as any)?.claims
  const roles = extractRolesFromClaims(claims)
  if (!(roles.has('trustee') || roles.has('admin'))) return forbidden(c)
  return next()
}
