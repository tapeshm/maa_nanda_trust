import type { JWTPayload } from 'jose'

export type VerifyResult = { payload: JWTPayload }

export interface TokenVerifier {
  verify(jwt: string): Promise<VerifyResult>
}

