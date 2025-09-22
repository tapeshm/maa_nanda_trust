import type { Context } from 'hono'

// Helper to read environment bindings from either a Hono Context or a plain object
export function readEnv(cOrEnv: Context | unknown): any {
  return (cOrEnv as Context)?.env ?? (cOrEnv as any) ?? {}
}

export function getString(envOrCtx: Context | unknown, key: string): string | undefined {
  const env = readEnv(envOrCtx)
  const val = env?.[key]
  return typeof val === 'string' && val.length > 0 ? val : undefined
}

export function getBoolean(envOrCtx: Context | unknown, key: string, defaultVal = false): boolean {
  const env = readEnv(envOrCtx)
  const v = env?.[key]
  if (typeof v === 'boolean') return v
  if (typeof v === 'string') return v === '1' || v.toLowerCase() === 'true'
  return defaultVal
}

export function getNumber(envOrCtx: Context | unknown, key: string): number | undefined {
  const env = readEnv(envOrCtx)
  const v = env?.[key]
  const n = typeof v === 'string' ? Number(v) : typeof v === 'number' ? v : NaN
  return Number.isFinite(n) ? Number(n) : undefined
}

export function getTrustedOrigins(envOrCtx: Context | unknown): string[] {
  const v = getString(envOrCtx, 'AUTH_TRUSTED_ORIGINS')
  if (!v) return []
  return v.split(',').map((s) => s.trim()).filter(Boolean)
}

export function getRateLimit(envOrCtx: Context | unknown): { max: number; windowS: number } {
  const max = getNumber(envOrCtx, 'AUTH_RATE_LIMIT_MAX') ?? 10
  const windowS = getNumber(envOrCtx, 'AUTH_RATE_LIMIT_WINDOW_S') ?? 60
  return { max, windowS }
}

