import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { Hono } from 'hono'
import { SignJWT, exportJWK, generateKeyPair } from 'jose'

import upload from '../../src/routes/admin/upload'
import media from '../../src/routes/media'
import type { Bindings } from '../../src/bindings'

interface TestBindings extends Bindings {
  SUPABASE_URL: string
  SUPABASE_ANON_KEY: string
  AUTH_TRUSTED_ORIGINS: string
  AUTH_RATE_LIMIT_MAX?: string
  AUTH_RATE_LIMIT_WINDOW_S?: string
  MEDIA_MAX_UPLOAD_BYTES?: string
}

function createKv() {
  const store = new Map<string, { value: string; expireAt?: number }>()
  return {
    async get(key: string, opts?: { type: 'json' | 'text' | 'arrayBuffer' }) {
      const entry = store.get(key)
      if (!entry) return null
      const { value, expireAt } = entry
      if (typeof expireAt === 'number' && expireAt <= Math.floor(Date.now() / 1000)) {
        store.delete(key)
        return null
      }
      if (opts?.type === 'json') {
        try {
          return JSON.parse(value)
        } catch {
          return null
        }
      }
      return value
    },
    async put(key: string, value: string, opts?: { expirationTtl?: number }) {
      const ttl = typeof opts?.expirationTtl === 'number' ? Math.max(0, opts.expirationTtl) : undefined
      const expireAt = typeof ttl === 'number' ? Math.floor(Date.now() / 1000) + ttl : undefined
      const stored = typeof value === 'string' ? value : JSON.stringify(value)
      store.set(key, { value: stored, expireAt })
    },
  }
}

function createR2() {
  const store = new Map<string, { body: Uint8Array; httpMetadata?: { contentType?: string } }>()
  return {
    async put(key: string, value: ArrayBuffer | ArrayBufferView, options?: { httpMetadata?: { contentType?: string } }) {
      const bytes = value instanceof ArrayBuffer
        ? new Uint8Array(value)
        : new Uint8Array(value.buffer.slice((value as ArrayBufferView).byteOffset, (value as ArrayBufferView).byteOffset + (value as ArrayBufferView).byteLength))
      store.set(key, { body: bytes, httpMetadata: options?.httpMetadata })
    },
    async get(key: string) {
      const entry = store.get(key)
      if (!entry) return null
      return {
        body: entry.body,
        writeHttpMetadata(headers: Headers) {
          if (entry.httpMetadata?.contentType) headers.set('Content-Type', entry.httpMetadata.contentType)
        },
        httpMetadata: entry.httpMetadata ?? {},
        arrayBuffer: async () => entry.body.buffer.slice(0),
      }
    },
    dump() {
      return store
    },
  }
}

function createApp() {
  const app = new Hono<{ Bindings: TestBindings }>()
  app.route('/admin', upload)
  app.route('/media', media)
  return app
}

async function issueToken(roles: string[]) {
  const { publicKey, privateKey } = await generateKeyPair('RS256')
  const jwk: any = await exportJWK(publicKey)
  jwk.kid = 'TEST'
  const now = Math.floor(Date.now() / 1000)
  const token = await new SignJWT({ roles })
    .setProtectedHeader({ alg: 'RS256', kid: 'TEST' })
    .setIssuer('https://example.supabase.co/auth/v1')
    .setIssuedAt(now)
    .setExpirationTime(now + 300)
    .sign(privateKey)

  const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation((input: RequestInfo | URL) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url
    if (url.endsWith('/.well-known/jwks.json')) {
      return Promise.resolve(new Response(JSON.stringify({ keys: [jwk] }), { status: 200 }))
    }
    return Promise.resolve(new Response('not-found', { status: 404 }))
  })

  return { token, fetchSpy }
}

function buildUploadRequest(url: string, token: string | null, file: File, options?: { csrf?: string; origin?: string; ip?: string }) {
  const formData = new FormData()
  formData.append('image', file)
  const csrf = options?.csrf ?? 'csrf-token'
  const headers: Record<string, string> = {
    Origin: options?.origin ?? 'https://admin.example.com',
    'cf-connecting-ip': options?.ip ?? '1.2.3.4',
  }
  const cookieParts = [`__Host-csrf=${csrf}`]
  if (token) {
    cookieParts.unshift(`__Host-access_token=${token}`)
  }
  headers.Cookie = cookieParts.join('; ')
  headers['X-CSRF-Token'] = csrf
  return new Request(url, {
    method: 'POST',
    headers,
    body: formData,
  })
}

let fetchSpy: ReturnType<typeof vi.spyOn> | null = null

beforeEach(() => {
  vi.restoreAllMocks()
  fetchSpy = null
})

afterEach(() => {
  fetchSpy?.mockRestore()
})

describe('admin image upload route', () => {
  it('returns 401 for unauthenticated upload', async () => {
    const app = createApp()
    const env: TestBindings = {
      SUPABASE_URL: 'https://example.supabase.co',
      SUPABASE_ANON_KEY: 'anon',
      AUTH_TRUSTED_ORIGINS: 'https://admin.example.com',
      R2: createR2(),
      KV: createKv(),
    }

    const file = new File([new Uint8Array([0x89])], 'photo.png', { type: 'image/png' })
    const req = buildUploadRequest('https://admin.example.com/admin/upload-image', null, file)
    const res = await app.fetch(req, env as any)
    expect(res.status).toBe(401)
  })

  it('returns 403 for authenticated non-admin user', async () => {
    const app = createApp()
    const env: TestBindings = {
      SUPABASE_URL: 'https://example.supabase.co',
      SUPABASE_ANON_KEY: 'anon',
      AUTH_TRUSTED_ORIGINS: 'https://admin.example.com',
      R2: createR2(),
      KV: createKv(),
    }

    const { token, fetchSpy: spy } = await issueToken(['viewer'])
    fetchSpy = spy

    const file = new File([new Uint8Array([0x89])], 'photo.png', { type: 'image/png' })
    const req = buildUploadRequest('https://admin.example.com/admin/upload-image', token, file)
    const res = await app.fetch(req, env as any)
    expect(res.status).toBe(403)
  })

  it('returns 403 when CSRF token is missing', async () => {
    const app = createApp()
    const env: TestBindings = {
      SUPABASE_URL: 'https://example.supabase.co',
      SUPABASE_ANON_KEY: 'anon',
      AUTH_TRUSTED_ORIGINS: 'https://admin.example.com',
      R2: createR2(),
      KV: createKv(),
    }

    const { token, fetchSpy: spy } = await issueToken(['admin'])
    fetchSpy = spy

    const file = new File([new Uint8Array([0x89])], 'photo.png', { type: 'image/png' })
    const formData = new FormData()
    formData.append('image', file)
    const headers = new Headers({
      Origin: 'https://admin.example.com',
      Cookie: `__Host-access_token=${token}; __Host-csrf=csrf-token`,
      'cf-connecting-ip': '1.1.1.1',
    })
    const req = new Request('https://admin.example.com/admin/upload-image', {
      method: 'POST',
      headers,
      body: formData,
    })
    const res = await app.fetch(req, env as any)
    expect(res.status).toBe(403)
  })

  it('stores valid images and returns media URL', async () => {
    const app = createApp()
    const r2 = createR2()
    const env: TestBindings = {
      SUPABASE_URL: 'https://example.supabase.co',
      SUPABASE_ANON_KEY: 'anon',
      AUTH_TRUSTED_ORIGINS: 'https://admin.example.com',
      AUTH_RATE_LIMIT_MAX: '5',
      AUTH_RATE_LIMIT_WINDOW_S: '60',
      R2: r2,
      KV: createKv(),
    }

    const { token, fetchSpy: spy } = await issueToken(['admin'])
    fetchSpy = spy

    const file = new File([new Uint8Array([0x89, 0x50])], 'photo.png', { type: 'image/png' })
    const req = buildUploadRequest('https://admin.example.com/admin/upload-image', token, file)
    const res = await app.fetch(req, env as any)
    expect(res.status).toBe(200)
    const payload = await res.json()
    expect(payload.url).toMatch(/^\/media\/images\//)

    const stored = Array.from(r2.dump().entries())
    expect(stored.length).toBe(1)
    const [, meta] = stored[0]
    expect(meta.httpMetadata?.contentType).toBe('image/png')
  })

  it('rejects files over configured limit', async () => {
    const app = createApp()
    const env: TestBindings = {
      SUPABASE_URL: 'https://example.supabase.co',
      SUPABASE_ANON_KEY: 'anon',
      AUTH_TRUSTED_ORIGINS: 'https://admin.example.com',
      MEDIA_MAX_UPLOAD_BYTES: '10',
      R2: createR2(),
      KV: createKv(),
    }

    const { token, fetchSpy: spy } = await issueToken(['admin'])
    fetchSpy = spy

    const large = new Uint8Array(20).fill(0x41)
    const file = new File([large], 'large.png', { type: 'image/png' })
    const req = buildUploadRequest('https://admin.example.com/admin/upload-image', token, file)
    const res = await app.fetch(req, env as any)
    expect(res.status).toBe(413)
  })

  it('rejects unsupported mime types', async () => {
    const app = createApp()
    const env: TestBindings = {
      SUPABASE_URL: 'https://example.supabase.co',
      SUPABASE_ANON_KEY: 'anon',
      AUTH_TRUSTED_ORIGINS: 'https://admin.example.com',
      R2: createR2(),
      KV: createKv(),
    }

    const { token, fetchSpy: spy } = await issueToken(['admin'])
    fetchSpy = spy

    const file = new File([new Uint8Array([0x47])], 'anim.gif', { type: 'image/gif' })
    const req = buildUploadRequest('https://admin.example.com/admin/upload-image', token, file)
    const res = await app.fetch(req, env as any)
    expect(res.status).toBe(415)
  })

  it('rejects files where extension and mime type disagree', async () => {
    const app = createApp()
    const env: TestBindings = {
      SUPABASE_URL: 'https://example.supabase.co',
      SUPABASE_ANON_KEY: 'anon',
      AUTH_TRUSTED_ORIGINS: 'https://admin.example.com',
      R2: createR2(),
      KV: createKv(),
    }

    const { token, fetchSpy: spy } = await issueToken(['admin'])
    fetchSpy = spy

    const pngBytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47])
    const file = new File([pngBytes], 'photo.jpeg', { type: 'image/png' })
    const req = buildUploadRequest('https://admin.example.com/admin/upload-image', token, file)
    const res = await app.fetch(req, env as any)
    expect(res.status).toBe(415)
  })

  it('enforces trusted origins for uploads', async () => {
    const app = createApp()
    const env: TestBindings = {
      SUPABASE_URL: 'https://example.supabase.co',
      SUPABASE_ANON_KEY: 'anon',
      AUTH_TRUSTED_ORIGINS: 'https://admin.example.com',
      R2: createR2(),
      KV: createKv(),
    }

    const { token, fetchSpy: spy } = await issueToken(['admin'])
    fetchSpy = spy

    const file = new File([new Uint8Array([0x89])], 'photo.png', { type: 'image/png' })
    const req = buildUploadRequest('https://admin.example.com/admin/upload-image', token, file, {
      origin: 'https://evil.example.com',
    })
    const res = await app.fetch(req, env as any)
    expect(res.status).toBe(403)
  })

  it('returns 429 after exceeding rate limit', async () => {
    const app = createApp()
    const env: TestBindings = {
      SUPABASE_URL: 'https://example.supabase.co',
      SUPABASE_ANON_KEY: 'anon',
      AUTH_TRUSTED_ORIGINS: 'https://admin.example.com',
      AUTH_RATE_LIMIT_MAX: '1',
      AUTH_RATE_LIMIT_WINDOW_S: '60',
      R2: createR2(),
      KV: createKv(),
    }

    const { token, fetchSpy: spy } = await issueToken(['admin'])
    fetchSpy = spy

    const file = new File([new Uint8Array([0x89])], 'photo.png', { type: 'image/png' })
    const first = await app.fetch(buildUploadRequest('https://admin.example.com/admin/upload-image', token, file), env as any)
    expect(first.status).toBe(200)

    const secondFile = new File([new Uint8Array([0x89])], 'photo2.png', { type: 'image/png' })
    const second = await app.fetch(buildUploadRequest('https://admin.example.com/admin/upload-image', token, secondFile), env as any)
    expect(second.status).toBe(429)
  })
})

describe('media delivery routes', () => {
  it('serves stored images with cache headers', async () => {
    const app = createApp()
    const r2 = createR2()
    const env: TestBindings = {
      SUPABASE_URL: 'https://example.supabase.co',
      SUPABASE_ANON_KEY: 'anon',
      AUTH_TRUSTED_ORIGINS: 'https://admin.example.com',
      AUTH_RATE_LIMIT_MAX: '5',
      AUTH_RATE_LIMIT_WINDOW_S: '60',
      R2: r2,
      KV: createKv(),
    }

    const { token, fetchSpy: spy } = await issueToken(['admin'])
    fetchSpy = spy

    const file = new File([new Uint8Array([0x89, 0x50])], 'photo.png', { type: 'image/png' })
    const uploadRes = await app.fetch(
      buildUploadRequest('https://admin.example.com/admin/upload-image', token, file),
      env as any,
    )
    expect(uploadRes.status).toBe(200)
    const { url } = await uploadRes.json()

    const mediaRes = await app.fetch(new Request(`https://admin.example.com${url}`), env as any)
    expect(mediaRes.status, `media status=${mediaRes.status} url=${url}`).toBe(200)
    expect(mediaRes.headers.get('Cache-Control')).toBe('public, max-age=31536000, immutable')
    expect(mediaRes.headers.get('X-Content-Type-Options')).toBe('nosniff')
    expect(mediaRes.headers.get('Content-Type')).toBe('image/png')
  })

  it('accepts nested keys and rejects traversal attempts', async () => {
    const app = createApp()
    const env: TestBindings = {
      SUPABASE_URL: 'https://example.supabase.co',
      SUPABASE_ANON_KEY: 'anon',
      AUTH_TRUSTED_ORIGINS: 'https://admin.example.com',
      AUTH_RATE_LIMIT_MAX: '5',
      AUTH_RATE_LIMIT_WINDOW_S: '60',
      R2: createR2(),
      KV: createKv(),
    }

    const { token, fetchSpy: spy } = await issueToken(['admin'])
    fetchSpy = spy

    const file = new File([new Uint8Array([0x89])], 'photo.png', { type: 'image/png' })
    const uploadRes = await app.fetch(
      buildUploadRequest('https://admin.example.com/admin/upload-image', token, file),
      env as any,
    )
    expect(uploadRes.status).toBe(200)
    const { url } = await uploadRes.json()

    const traversal = await app.fetch(new Request('https://admin.example.com/media/..%2fsecret'), env as any)
    expect(traversal.status).toBe(400)

    const mediaRes = await app.fetch(new Request(`https://admin.example.com${url}`), env as any)
    expect(mediaRes.status, `media status=${mediaRes.status} url=${url}`).toBe(200)
  })

  it('HEAD requests return headers without body', async () => {
    const app = createApp()
    const env: TestBindings = {
      SUPABASE_URL: 'https://example.supabase.co',
      SUPABASE_ANON_KEY: 'anon',
      AUTH_TRUSTED_ORIGINS: 'https://admin.example.com',
      AUTH_RATE_LIMIT_MAX: '5',
      AUTH_RATE_LIMIT_WINDOW_S: '60',
      R2: createR2(),
      KV: createKv(),
    }

    const { token, fetchSpy: spy } = await issueToken(['admin'])
    fetchSpy = spy

    const file = new File([new Uint8Array([0x89])], 'photo.png', { type: 'image/png' })
    const uploadRes = await app.fetch(
      buildUploadRequest('https://admin.example.com/admin/upload-image', token, file),
      env as any,
    )
    expect(uploadRes.status).toBe(200)
    const { url } = await uploadRes.json()

    const headRes = await app.fetch(new Request(`https://admin.example.com${url}`, { method: 'HEAD' }), env as any)
    expect(headRes.status, `HEAD status=${headRes.status} url=${url}`).toBe(200)
    expect(headRes.headers.get('X-Content-Type-Options')).toBe('nosniff')
    const body = await headRes.arrayBuffer()
    expect(body.byteLength).toBe(0)
  })
})
