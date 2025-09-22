// [D3:auth.step-01:cookie-helpers]
/**
 * Auth cookie helpers for access and refresh tokens using __Host-* semantics.
 * Ensures: Secure, HttpOnly, Path=/, SameSite=Lax, and no Domain attribute.
 */
import type { Context } from 'hono'
import { setCookie } from 'hono/cookie'

// [D3:auth.step-01:cookie-constants]
export const ACCESS_COOKIE_NAME = '__Host-access_token'
export const REFRESH_COOKIE_NAME = '__Host-refresh_token'

const DEFAULT_ACCESS_TTL_S = 600 // 10 minutes
const DEFAULT_REFRESH_TTL_S = 90 * 24 * 60 * 60 // 90 days

function getEnvNumber(c: Context, key: string): number | undefined {
  const raw = (c.env as Record<string, unknown> | undefined)?.[key]
  if (raw == null) return undefined
  const n = Number(raw)
  return Number.isFinite(n) ? n : undefined
}

function getAccessTtl(c: Context, override?: number): number {
  if (override && override > 0) return override
  const fromEnv = getEnvNumber(c, 'ACCESS_COOKIE_TTL')
  return fromEnv && fromEnv > 0 ? fromEnv : DEFAULT_ACCESS_TTL_S
}

function getRefreshTtl(c: Context, override?: number): number {
  if (override && override > 0) return override
  const fromEnv = getEnvNumber(c, 'REFRESH_COOKIE_TTL')
  return fromEnv && fromEnv > 0 ? fromEnv : DEFAULT_REFRESH_TTL_S
}

// [D3:auth.step-01:setters]
export function setAccessCookie(c: Context, token: string, ttlSeconds?: number): void {
  const maxAge = getAccessTtl(c, ttlSeconds)
  setCookie(c, ACCESS_COOKIE_NAME, token, {
    path: '/',
    httpOnly: true,
    secure: true,
    sameSite: 'Lax',
    maxAge,
  })
}

export function setRefreshCookie(c: Context, token: string, ttlSeconds?: number): void {
  const maxAge = getRefreshTtl(c, ttlSeconds)
  setCookie(c, REFRESH_COOKIE_NAME, token, {
    path: '/',
    httpOnly: true,
    secure: true,
    sameSite: 'Lax',
    maxAge,
  })
}

// [D3:auth.step-01:clearers]
export function clearAccessCookie(c: Context): void {
  setCookie(c, ACCESS_COOKIE_NAME, '', {
    path: '/',
    httpOnly: true,
    secure: true,
    sameSite: 'Lax',
    maxAge: 0,
  })
}

export function clearRefreshCookie(c: Context): void {
  setCookie(c, REFRESH_COOKIE_NAME, '', {
    path: '/',
    httpOnly: true,
    secure: true,
    sameSite: 'Lax',
    maxAge: 0,
  })
}

export function clearAllAuthCookies(c: Context): void {
  clearAccessCookie(c)
  clearRefreshCookie(c)
}

