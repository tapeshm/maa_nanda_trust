import { describe, it, expect } from 'vitest'
import { Hono } from 'hono'
import { corsForAuth } from '../../src/middleware/cors'
import { rateLimit } from '../../src/middleware/rateLimit'
import { CSRF_COOKIE_NAME } from '../../src/middleware/csrf'

function createKv() {
  const store = new Map<string, { value: string; expireAt?: number }>();
  return {
    async get(key: string, opts?: { type: 'json' | 'text' | 'arrayBuffer' }) {
      const entry = store.get(key);
      if (!entry) return null;
      const { value, expireAt } = entry;
      if (typeof expireAt === 'number' && expireAt <= Math.floor(Date.now() / 1000)) {
        store.delete(key);
        return null;
      }
      if (opts?.type === 'json') {
        try {
          return JSON.parse(value);
        } catch {
          return null;
        }
      }
      return value;
    },
    async put(key: string, value: string, opts?: { expirationTtl?: number }) {
      const ttl = typeof opts?.expirationTtl === 'number' ? Math.max(0, opts.expirationTtl) : undefined;
      const expireAt = typeof ttl === 'number' ? Math.floor(Date.now() / 1000) + ttl : undefined;
      const stored = typeof value === 'string' ? value : JSON.stringify(value);
      store.set(key, { value: stored, expireAt });
    },
  };
}

const csrfToken = 'csrf-rate-token'
const csrfCookie = `${CSRF_COOKIE_NAME}=${csrfToken}`

describe('rate limit and CORS for auth', () => {
  it('enforces rate limit on /login', async () => {
    const app = new Hono()
    const kv = createKv();
    const getEnv = (_c: any) => ({ AUTH_RATE_LIMIT_MAX: '2', AUTH_RATE_LIMIT_WINDOW_S: '60', KV: kv })
    app.use('/login', rateLimit(getEnv))
    app.post('/login', (c) => c.json({ ok: true }))

    const headers = { 'cf-connecting-ip': '1.2.3.4' } as any
    const makeOpts = () => ({
      method: 'POST',
      headers: { ...headers, Cookie: csrfCookie, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ email: 'e', password: 'p', csrf_token: csrfToken }) as any,
    })
    const r1 = await app.request('http://x/login', makeOpts())
    expect(r1.status).toBe(200)
    const r2 = await app.request('http://x/login', makeOpts())
    expect(r2.status).toBe(200)
    const r3 = await app.request('http://x/login', makeOpts())
    expect(r3.status).toBe(429)
  })

  it('rejects disallowed origins with credentials', async () => {
    const app = new Hono()
    const getEnv = (_c: any) => ({ AUTH_TRUSTED_ORIGINS: 'https://good.example' })
    app.use('/login', corsForAuth(getEnv))
    app.post('/login', (c) => c.json({ ok: true }))

    // Disallowed origin preflight
    const pre = await app.request('http://x/login', {
      method: 'OPTIONS',
      headers: { origin: 'https://evil.example' } as any,
    })
    expect(pre.status).toBe(403)

    // Allowed origin preflight
    const preOk = await app.request('http://x/login', {
      method: 'OPTIONS',
      headers: { origin: 'https://good.example' } as any,
    })
    expect(preOk.status).toBe(204)
    expect(preOk.headers.get('Access-Control-Allow-Credentials')).toBe('true')

    // Allowed actual request
    const act = await app.request('http://x/login', {
      method: 'POST',
      headers: {
        origin: 'https://good.example',
        Cookie: csrfCookie,
        'Content-Type': 'application/x-www-form-urlencoded',
      } as any,
      body: new URLSearchParams({ email: 'e', password: 'p', csrf_token: csrfToken }) as any,
    })
    expect(act.status).toBe(200)
    expect(act.headers.get('Access-Control-Allow-Origin')).toBe('https://good.example')
    expect(act.headers.get('Access-Control-Allow-Credentials')).toBe('true')
  })

  it('enforces rate limit on /logout', async () => {
    const app = new Hono()
    const kv = createKv();
    const getEnv = (_c: any) => ({ AUTH_RATE_LIMIT_MAX: '1', AUTH_RATE_LIMIT_WINDOW_S: '60', KV: kv })
    app.use('/logout', rateLimit(getEnv))
    app.post('/logout', (c) => c.json({ ok: true }))

    const headers = { 'cf-connecting-ip': '9.9.9.9' } as any
    const logoutOpts = {
      method: 'POST',
      headers: { ...headers, Cookie: csrfCookie, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ csrf_token: csrfToken }) as any,
    }
    const r1 = await app.request('http://x/logout', logoutOpts)
    expect(r1.status).toBe(200)
    const r2 = await app.request('http://x/logout', logoutOpts)
    expect(r2.status).toBe(429)
  })

  it('sets Vary: Origin on CORS responses', async () => {
    const app = new Hono()
    const getEnv = (_c: any) => ({ AUTH_TRUSTED_ORIGINS: 'https://good.example' })
    app.use('/login', corsForAuth(getEnv))
    app.post('/login', (c) => c.json({ ok: true }))

    const pre = await app.request('http://x/login', {
      method: 'OPTIONS',
      headers: { origin: 'https://good.example' } as any,
    })
    expect(pre.headers.get('Vary')).toBe('Origin')

    const act = await app.request('http://x/login', {
      method: 'POST',
      headers: {
        origin: 'https://good.example',
        Cookie: csrfCookie,
        'Content-Type': 'application/x-www-form-urlencoded',
      } as any,
      body: new URLSearchParams({ email: 'e', password: 'p', csrf_token: csrfToken }) as any,
    })
    expect(act.headers.get('Vary')).toBe('Origin')
  })
})
