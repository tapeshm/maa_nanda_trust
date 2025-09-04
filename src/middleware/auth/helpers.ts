import type { Context, MiddlewareHandler } from 'hono'
import type { JWTPayload } from 'jose'

export function trimSlash(u: string) {
  return u.endsWith('/') ? u.slice(0, -1) : u
}

export function decodeB64(s: string): string {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/')
  const pad = b64.length % 4 ? '='.repeat(4 - (b64.length % 4)) : ''
  // Workers: atob; Node/Bun: Buffer
  // @ts-ignore
  return typeof atob === 'function'
    // @ts-ignore
    ? atob(b64 + pad)
    : Buffer.from(b64 + pad, 'base64').toString('utf8')
}

export function extractRolesFromClaims(
  claims: (JWTPayload & { [k: string]: any }) | null
): Set<string> {
  const roles = new Set<string>()
  if (!claims) return roles
  const appMeta = (claims as any).app_metadata as
    | { role?: string; roles?: string[] }
    | undefined
  if (appMeta) {
    if (Array.isArray(appMeta.roles)) for (const r of appMeta.roles) if (typeof r === 'string') roles.add(r.toLowerCase())
    if (typeof appMeta.role === 'string') roles.add(appMeta.role.toLowerCase())
  }
  return roles
}

// Exported for tests; not used by middleware directly anymore
export function isDebug(c: Context): boolean {
  try {
    const v = (c as any)?.env?.DEBUG_AUTH
    if (typeof v === 'string') return /^(1|true|yes)$/i.test(v)
    if (typeof v === 'boolean') return v
  } catch {}
  const gv = (globalThis as any)?.DEBUG_AUTH
  if (typeof gv === 'string') return /^(1|true|yes)$/i.test(gv)
  if (typeof gv === 'boolean') return gv
  try {
    const pv = (globalThis as any)?.process?.env?.DEBUG_AUTH
    if (typeof pv === 'string') return /^(1|true|yes)$/i.test(pv)
  } catch {}
  return false
}

export type { MiddlewareHandler }
