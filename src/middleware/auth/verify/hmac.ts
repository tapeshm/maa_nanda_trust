import { jwtVerify } from 'jose'
import type { JWTPayload } from 'jose'
import type { TokenVerifier, VerifyResult } from './types'

export function createHmacVerifier(opts: {
  secret: string
  expectedIssuer: string
  expectedAudience?: 'authenticated'
}): TokenVerifier {
  const key = new TextEncoder().encode(opts.secret)
  return {
    async verify(jwt: string): Promise<VerifyResult> {
      const { payload } = await jwtVerify(jwt, key as unknown as CryptoKey, {
        issuer: opts.expectedIssuer,
        audience: opts.expectedAudience as any,
      })
      return { payload: payload as JWTPayload }
    },
  }
}

