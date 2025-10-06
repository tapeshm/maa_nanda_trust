import { Hono } from 'hono'
import type { Bindings } from '../../src/bindings'
import { env as baseEnv } from 'cloudflare:test'
import { csrfProtect } from '../../src/middleware/csrf'
import { rateLimit } from '../../src/middleware/rateLimit'
import { handleSaveContent } from '../../src/routes/admin/saveContent'
import { renderFallbackHtml } from '../../src/utils/editor/render'

export const authState = {
  authenticated: true,
  roles: ['admin'] as string[],
}

export interface TestBindings extends Bindings {
  AUTH_TRUSTED_ORIGINS: string
  AUTH_RATE_LIMIT_MAX: string
  AUTH_RATE_LIMIT_WINDOW_S: string
  CONTENT_MAX_BYTES: string
  KV: ReturnType<typeof createKv>
}

function mockRequireAuth() {
  return async (c: any, next: any) => {
    if (!authState.authenticated) {
      return c.text('Unauthorized', 401)
    }
    c.set('auth', { claims: { roles: authState.roles } })
    return next()
  }
}

function mockRequireAdmin() {
  return async (c: any, next: any) => {
    if (!authState.roles.includes('admin')) {
      return c.text('Forbidden', 403)
    }
    return next()
  }
}

export function createKv() {
  const store = new Map<string, { value: string; expireAt?: number }>()
  return {
    async get(key: string) {
      const record = store.get(key)
      if (!record) return null
      if (record.expireAt && record.expireAt <= Math.floor(Date.now() / 1000)) {
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
      store.set(key, {
        value: typeof value === 'string' ? value : JSON.stringify(value),
        expireAt: Math.floor(Date.now() / 1000) + ttl,
      })
    },
  }
}

export function createEnv(overrides: Partial<TestBindings> = {}): TestBindings {
  const kv = createKv()
  return {
    ...baseEnv,
    KV: kv,
    AUTH_TRUSTED_ORIGINS: 'https://admin.example.com',
    AUTH_RATE_LIMIT_MAX: '10',
    AUTH_RATE_LIMIT_WINDOW_S: '60',
    CONTENT_MAX_BYTES: '262144',
    ...overrides,
  } as TestBindings
}

export function buildRequest(options: {
  slug: string
  editorId?: string
  documentId?: string
  profile?: string
  content?: any
  html?: string | null
  etag?: string | null
  csrf?: string | null
  origin?: string | null
  ip?: string
}) {
  const {
    slug,
    editorId = 'editor_main',
    documentId = 'doc-1',
    profile = 'full',
    content = { type: 'doc', content: [] },
    etag,
    csrf = 'csrf-token',
    origin = 'https://admin.example.com',
    ip = '1.1.1.1',
  } = options

  const formData = new FormData()
  formData.set('slug', slug)
  const serialized = JSON.stringify(content)
  formData.set(`content_json[${editorId}]`, serialized)
  const html =
    options.html !== undefined && options.html !== null
      ? options.html
      : renderFallbackHtml(content, { profile, slug, documentId })
  formData.set(`content_html[${editorId}]`, html)
  formData.set(`document_id[${editorId}]`, documentId)
  formData.set(`profile[${editorId}]`, profile)
  formData.set('csrf_token', csrf ?? '')
  if (etag) {
    formData.set(`etag[${editorId}]`, etag)
  }

  const headers = new Headers({
    'cf-connecting-ip': ip,
  })

  if (origin) {
    headers.set('Origin', origin)
  }
  headers.set('Host', 'admin.example.com')

  const cookies = []
  if (csrf) {
    headers.set('X-CSRF-Token', csrf)
    headers.set('HX-CSRF-Token', csrf)
    cookies.push(`__Host-csrf=${csrf}`)
  }

  if (cookies.length > 0) {
    headers.set('Cookie', cookies.join('; '))
  }

  return new Request('https://admin.example.com/admin/save-content', {
    method: 'POST',
    body: formData,
    headers,
  })
}

export function createApp() {
  const app = new Hono<{ Bindings: TestBindings }>()
  app.use('/admin/*', csrfProtect())
  app.use('/admin/*', rateLimit((c) => c.env))
  app.post('/admin/save-content', mockRequireAuth(), mockRequireAdmin(), handleSaveContent)
  return app
}

export async function resetEditorDocuments() {
  await baseEnv.DB.prepare('DELETE FROM editor_documents').run()
}

export { baseEnv }
