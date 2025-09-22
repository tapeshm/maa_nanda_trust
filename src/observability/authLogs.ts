import type { Context } from 'hono'
import { logger } from './logger'

export type AuthEvent =
  | 'auth.verify_ok'
  | 'auth.expired'
  | 'auth.sig_fail'
  | 'auth.jwks_miss'
  | 'auth.refresh_ok'
  | 'auth.refresh_invalid_grant'
  | 'auth.refresh_used'
  | 'auth.refresh_5xx'

export function getCorrelationId(c: Context): string {
  const ray = c.req.header('cf-ray')
  if (ray) return ray
  let rid = c.req.header('x-request-id')
  if (!rid) {
    const b = new Uint8Array(16)
    crypto.getRandomValues(b)
    rid = Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('')
    c.header('x-request-id', rid)
  }
  return rid
}

export function logAuthEvent(c: Context, event: AuthEvent, extra?: Record<string, unknown>) {
  const rid = getCorrelationId(c)
  const base: Record<string, unknown> = { event, rid }
  const safe = Object.fromEntries(
    Object.entries(extra || {}).filter(([k]) => !String(k).toLowerCase().includes('token')),
  )
  try {
    logger.info(JSON.stringify({ ...base, ...safe }))
  } catch {
    logger.info(String(event), rid)
  }
}
