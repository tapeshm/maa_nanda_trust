import type { MiddlewareHandler } from 'hono'
import { getRateLimit } from '../utils/env'

type Key = string

type KvNamespace = {
  get: (key: string, options?: { type: 'text' | 'json' | 'arrayBuffer' }) => Promise<any>
  put: (key: string, value: string, options?: { expirationTtl?: number }) => Promise<void>
}

const PREFIX = 'auth_rate:'

function nowSeconds(): number {
  return Math.floor(Date.now() / 1000)
}

function clientKey(c: any): Key {
  const ip = c.req.header('cf-connecting-ip') || c.req.header('x-forwarded-for') || ''
  const ua = c.req.header('user-agent') || ''
  return ip || ua || 'anon'
}

function resolveKv(c: any, env: Record<string, any>): KvNamespace | undefined {
  const candidates = [env.AUTH_RATE_LIMIT_KV, env.KV, c?.env?.AUTH_RATE_LIMIT_KV, c?.env?.KV]
  for (const candidate of candidates) {
    if (candidate && typeof candidate.get === 'function' && typeof candidate.put === 'function') {
      return candidate as KvNamespace
    }
  }
  return undefined
}

export function rateLimit(getEnv: (c: any) => Record<string, any>): MiddlewareHandler {
  return async (c, next) => {
    const env = getEnv(c) || {}
    const { windowS, max } = getRateLimit(env)
    if (max <= 0) return next()

    const kv = resolveKv(c, env)
    if (!kv) {
      // Without a KV namespace we cannot persist counters reliably; allow request.
      return next()
    }

    // KV is eventually consistent across POPs; this provides coarse throttling which is acceptable for auth endpoints.
    const window = Math.max(1, windowS)
    const now = nowSeconds()
    const bucket = Math.floor(now / window)
    const pathname = typeof c.req.path === 'string' ? c.req.path : new URL(c.req.url).pathname
    const storageKey = `${PREFIX}${pathname}:${clientKey(c)}:${bucket}`

    let record: any = null
    try {
      record = await kv.get(storageKey, { type: 'json' })
    } catch {
      record = null
    }

    const prevCount = record && typeof record.count === 'number' ? record.count : 0
    const defaultReset = (bucket + 1) * window
    const resetAt = record && typeof record.resetAt === 'number' ? record.resetAt : defaultReset

    if (prevCount >= max) {
      const retry = Math.max(resetAt - now, 1)
      c.header('Retry-After', String(retry))
      return c.text('Too Many Requests', 429)
    }

    const nextCount = prevCount + 1
    const ttl = Math.max(resetAt - now, 1)
    const payload = JSON.stringify({ count: nextCount, resetAt })
    try {
      await kv.put(storageKey, payload, { expirationTtl: ttl })
    } catch {
      // If the write fails we still allow the request; subsequent requests may retry.
    }

    return next()
  }
}
