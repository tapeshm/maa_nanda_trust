// [D3:auth.step-03:verify]
import { createLocalJWKSet, jwtVerify, type JWK } from 'jose'
import type { Context } from 'hono'
import { fetchJwks, getIssuer, type Jwks } from './jwks'
import { readEnv } from '../utils/env'

export type AuthClaims = {
  sub: string
  exp: number
  iat: number
  iss: string
  aud?: string | string[]
  [k: string]: unknown
}

type EnvLike = { [k: string]: unknown }

function getExpectedAudience(envOrCtx: Context | EnvLike): string | undefined {
  const env = readEnv(envOrCtx)
  const aud = env.AUTH_JWT_AUD as string | undefined
  return aud && aud.length > 0 ? aud : undefined
}

async function verifyWithJwks(
  token: string,
  jwks: Jwks,
  expectedIss: string,
  expectedAud?: string,
  clockToleranceSec = 60,
) {
  //TODO: use p-256 (ES256) for jwt verification
  const jwkSet = createLocalJWKSet(jwks as { keys: JWK[] })
  const { payload, protectedHeader } = await jwtVerify(token, jwkSet, {
    algorithms: ['RS256', 'ES256'],
    issuer: expectedIss,
    audience: expectedAud,
    clockTolerance: clockToleranceSec,
  })
  return { payload: payload as AuthClaims, protectedHeader }
}

export async function verifyAccessJwt(
  token: string,
  envOrCtx: Context | EnvLike,
): Promise<AuthClaims> {
  const expectedIss = getIssuer(envOrCtx)
  const expectedAud = getExpectedAudience(envOrCtx)
  const env = readEnv(envOrCtx)
  const devLocal = String(env.DEV_SUPABASE_LOCAL ?? '0') === '1'
  const supabaseUrl = (env.SUPABASE_URL as string | undefined) || ''
  const host = (() => {
    try {
      return new URL(supabaseUrl).hostname
    } catch {
      return ''
    }
  })()
  const isLocalHost = host === 'localhost' || host === '127.0.0.1' || host === 'host.docker.internal' || host === '0.0.0.0'
  if (devLocal) {
    if (!isLocalHost) {
      throw new Error('DEV_SUPABASE_LOCAL enabled but SUPABASE_URL is not localhost/127.0.0.1')
    }
    const secret = env.SUPABASE_JWT_SECRET as string | undefined
    if (!secret) throw new Error('SUPABASE_JWT_SECRET missing for dev HS256')
    const { payload } = await jwtVerify(token, new TextEncoder().encode(secret), {
      algorithms: ['HS256'],
      issuer: expectedIss,
      audience: expectedAud,
      clockTolerance: 60,
    })
    return payload as AuthClaims
  }

  try {
    const jwks = await fetchJwks(envOrCtx)
    const { payload } = await verifyWithJwks(token, jwks, expectedIss, expectedAud)
    return payload
  } catch (e: any) {
    const code = e?.code || e?.name || ''
    const shouldForce =
      typeof code === 'string' &&
      (code.includes('ERR_JWKS_NO_MATCHING_KEY') ||
        code.includes('JWSSignatureVerificationFailed') ||
        code.includes('JWS') ||
        code.includes('JWKS'))

    if (!shouldForce) throw e

    // Force one re-fetch then retry once
    const jwks = await fetchJwks(envOrCtx, { force: true })
    const { payload } = await verifyWithJwks(token, jwks, expectedIss, expectedAud)
    return payload
  }
}
