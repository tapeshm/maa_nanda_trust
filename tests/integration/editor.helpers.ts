import { SignJWT } from 'jose'
import { vi } from 'vitest'

import type { Bindings } from '../../src/bindings'
import { env as baseEnv } from 'cloudflare:test'

export interface IntegrationBindings extends Bindings {
  AUTH_TRUSTED_ORIGINS: string
  AUTH_RATE_LIMIT_MAX: string
  AUTH_RATE_LIMIT_WINDOW_S: string
  MEDIA_MAX_UPLOAD_BYTES: string
  CONTENT_MAX_BYTES: string
  LOG_SAMPLE_RATE: string
  R2: ReturnType<typeof createTestR2>
  KV: ReturnType<typeof createTestKv>
}

export function createTestKv() {
  const store = new Map<string, { value: string; expireAt?: number }>()
  return {
    async get(key: string) {
      const record = store.get(key)
      if (!record) return null
      if (typeof record.expireAt === 'number' && record.expireAt <= Math.floor(Date.now() / 1000)) {
        store.delete(key)
        return null
      }
      try {
        return JSON.parse(record.value)
      } catch {
        return record.value
      }
    },
    async put(key: string, value: string, options?: { expirationTtl?: number }) {
      const ttl = options?.expirationTtl ?? 60
      const payload = typeof value === 'string' ? value : JSON.stringify(value)
      store.set(key, {
        value: payload,
        expireAt: Math.floor(Date.now() / 1000) + ttl,
      })
    },
  }
}

export function createTestR2() {
  const objects = new Map<string, { body: Uint8Array; httpMetadata?: { contentType?: string } }>()
  return {
    async put(key: string, value: ArrayBuffer | ArrayBufferView, options?: { httpMetadata?: { contentType?: string } }) {
      const bytes = value instanceof ArrayBuffer
        ? new Uint8Array(value)
        : new Uint8Array(
            value.buffer.slice(value.byteOffset, value.byteOffset + value.byteLength),
          )
      objects.set(key, { body: bytes, httpMetadata: options?.httpMetadata })
    },
    async get(key: string) {
      const record = objects.get(key)
      if (!record) return null
      return {
        body: record.body,
        writeHttpMetadata(headers: Headers) {
          if (record.httpMetadata?.contentType) {
            headers.set('Content-Type', record.httpMetadata.contentType)
          }
        },
        httpMetadata: record.httpMetadata ?? {},
        arrayBuffer: async () => record.body.buffer.slice(0),
      }
    },
    dump() {
      return objects
    },
  }
}

export async function issueAdminToken(roles: string[]) {
  const secret = new TextEncoder().encode('integration-secret')
  const now = Math.floor(Date.now() / 1000)
  const token = await new SignJWT({ roles })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuer('http://127.0.0.1:54321/auth/v1')
    .setIssuedAt(now)
    .setExpirationTime(now + 300)
    .sign(secret)

  const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation((input: RequestInfo | URL) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url
    if (url.endsWith('/.well-known/jwks.json')) {
      return Promise.resolve(new Response(JSON.stringify({ keys: [] }), { status: 200 }))
    }
    return Promise.resolve(new Response('not-found', { status: 404 }))
  })

  return { token, fetchSpy }
}

export const ADMIN_ORIGIN = 'https://admin.example.com'

export function createIntegrationEnv(overrides: Partial<IntegrationBindings> = {}): IntegrationBindings {
  const base: any = { ...baseEnv }
  return {
    ...base,
    AUTH_TRUSTED_ORIGINS: ADMIN_ORIGIN,
    AUTH_RATE_LIMIT_MAX: '20',
    AUTH_RATE_LIMIT_WINDOW_S: '60',
    MEDIA_MAX_UPLOAD_BYTES: '5242880',
    CONTENT_MAX_BYTES: '262144',
    LOG_SAMPLE_RATE: '1',
    DEV_SUPABASE_LOCAL: '1',
    SUPABASE_JWT_SECRET: 'integration-secret',
    R2: createTestR2(),
    KV: createTestKv(),
    SUPABASE_URL: 'http://127.0.0.1:54321',
    SUPABASE_ANON_KEY: 'anon',
    JWKS_URL: 'http://127.0.0.1:54321/auth/v1/.well-known/jwks.json',
    ...overrides,
  }
}

export function buildCookieHeader(cookies: Record<string, string>): string {
  return Object.entries(cookies)
    .map(([key, value]) => `${key}=${value}`)
    .join('; ')
}
