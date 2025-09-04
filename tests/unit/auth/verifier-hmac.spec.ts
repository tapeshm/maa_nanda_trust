import { describe, it, expect } from 'vitest'
import { SignJWT } from 'jose'
import { createHmacVerifier } from '../../../src/middleware/auth/verify/hmac'

describe('HMAC verifier', () => {
  it('verifies HS256 token with expected issuer/audience', async () => {
    const secret = 's3cret'
    const iss = 'http://localhost/auth/v1'
    const sub = 'user-123'
    const email = 'hmac@example.com'

    const token = await new SignJWT({ email })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuer(iss)
      .setAudience('authenticated')
      .setSubject(sub)
      .setIssuedAt()
      .setExpirationTime('5m')
      .sign(new TextEncoder().encode(secret))

    const verifier = createHmacVerifier({ secret, expectedIssuer: iss, expectedAudience: 'authenticated' })
    const { payload } = await verifier.verify(token)
    expect(payload.sub).toBe(sub)
    expect(payload.email).toBe(email)
  })
})

