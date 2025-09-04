import { describe, it, expect } from 'vitest'
import { readAccessTokenFromSsrCookie } from '../../../src/middleware/auth'

function makeCtxWithCookie(cookie: string) {
  return {
    // minimal Context shape for our purpose
    req: { raw: { headers: new Headers({ cookie }) } },
  } as any
}

function b64url(input: string) {
  return Buffer.from(input)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '')
}

describe('readAccessTokenFromSsrCookie', () => {
  const name = 'sb-xyz-auth-token'

  it('returns null when cookie missing', async () => {
    const ctx = makeCtxWithCookie('')
    const token = await readAccessTokenFromSsrCookie(ctx, name)
    expect(token).toBeNull()
  })

  it('reads top-level access_token from base64 cookie', async () => {
    const payload = { access_token: 'tok-123' }
    const value = `base64-${b64url(JSON.stringify(payload))}`
    const ctx = makeCtxWithCookie(`${name}=${value}`)
    const token = await readAccessTokenFromSsrCookie(ctx, name)
    expect(token).toBe('tok-123')
  })

  it('falls back to currentSession.access_token when access_token absent', async () => {
    const payload = { currentSession: { access_token: 'nested-456' } }
    const value = `base64-${b64url(JSON.stringify(payload))}`
    const ctx = makeCtxWithCookie(`${name}=${value}`)
    const token = await readAccessTokenFromSsrCookie(ctx, name)
    expect(token).toBe('nested-456')
  })

  it('supports chunked cookie values (.0, .1, ...)', async () => {
    const payload = { access_token: 'chunky-789' }
    const b64 = `base64-${b64url(JSON.stringify(payload))}`
    const mid = Math.ceil(b64.length / 2)
    const c0 = b64.slice(0, mid)
    const c1 = b64.slice(mid)
    const ctx = makeCtxWithCookie(`${name}.0=${c0}; ${name}.1=${c1}`)
    const token = await readAccessTokenFromSsrCookie(ctx, name)
    expect(token).toBe('chunky-789')
  })

  it('returns null for invalid JSON payload', async () => {
    const ctx = makeCtxWithCookie(`${name}=base64-not-json`)
    const token = await readAccessTokenFromSsrCookie(ctx, name)
    expect(token).toBeNull()
  })
})
