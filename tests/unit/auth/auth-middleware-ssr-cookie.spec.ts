import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { Hono } from 'hono'
import { SignJWT, generateKeyPair, exportJWK } from 'jose'
import { supabaseAuth } from '../../../src/middleware/auth'

function b64urlString(s: string) {
  return Buffer.from(s)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '')
}

describe('auth middleware - SSR cookie path', () => {
  const originalFetch = globalThis.fetch
  let privateKey: CryptoKey
  let publicJwk: any
  const projectUrl = 'https://abc123.supabase.co'
  const jwksUrl = `${projectUrl}/auth/v1/.well-known/jwks.json`
  const ssrCookieName = 'sb-abc123-auth-token'

  beforeEach(async () => {
    const pair = await generateKeyPair('RS256')
    privateKey = pair.privateKey
    publicJwk = await exportJWK(pair.publicKey)
    publicJwk.alg = 'RS256'
    publicJwk.kid = 'ssr-key'

    globalThis.fetch = vi.fn(async (input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url
      if (url === jwksUrl) {
        return new Response(JSON.stringify({ keys: [publicJwk] }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        })
      }
      return new Response('not found', { status: 404 })
    }) as any
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
  })

  it('reads access_token from sb-<project>-auth-token cookie and verifies locally', async () => {
    const iss = `${projectUrl}/auth/v1`
    const cookieToken = await new SignJWT({ email: 'ssr@example.com' })
      .setProtectedHeader({ alg: 'RS256', kid: 'ssr-key' })
      .setIssuer(iss)
      .setAudience('authenticated')
      .setSubject('user-ssr')
      .setIssuedAt()
      .setExpirationTime('5m')
      .sign(privateKey)

    // Build SSR cookie payload: base64-<url-safe(JSON)>
    const payload = { access_token: cookieToken }
    const cookieVal = `base64-${b64urlString(JSON.stringify(payload))}`

    const app = new Hono()
    app.use(
      '*',
      supabaseAuth({
        projectUrl,
        publishableKey: 'sb_publishable_dummy',
      }),
    )

    app.get('/', (c) => {
      const auth = c.get('auth')
      return c.json({ token: auth.token, userId: auth.userId, email: auth.claims?.email })
    })

    const req = new Request('http://localhost/', {
      headers: {
        Cookie: `${ssrCookieName}=${cookieVal}`,
      },
    })

    const res = await app.fetch(req, {} as any, { waitUntil() {} } as any)
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.userId).toBe('user-ssr')
    expect(data.email).toBe('ssr@example.com')
    expect(data.token).toBe(cookieToken)
  })
})
