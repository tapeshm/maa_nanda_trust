import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { createApp, createEnv, buildRequest, authState, resetEditorDocuments, baseEnv } from './save-content.setup'

describe('admin save content route', () => {
  const app = createApp()

  beforeEach(async () => {
    authState.authenticated = true
    authState.roles = ['admin']
    await resetEditorDocuments()
  })

  it('returns 401 when unauthenticated', async () => {
    authState.authenticated = false
    const env = createEnv()
    const res = await app.fetch(buildRequest({ slug: 'demo' }), env as any)
    expect(res.status).toBe(401)
  })

  it('returns 403 when user lacks admin role', async () => {
    authState.authenticated = true
    authState.roles = ['viewer']
    const env = createEnv()
    const res = await app.fetch(buildRequest({ slug: 'demo' }), env as any)
    expect(res.status).toBe(403)
  })

  it('enforces CSRF token', async () => {
    authState.authenticated = true
    authState.roles = ['admin']
    const env = createEnv()
    const req = buildRequest({ slug: 'demo', csrf: null })
    const res = await app.fetch(req, env as any)
    expect(res.status).toBe(403)
  })

  it('persists new content and updates existing rows', async () => {
    authState.authenticated = true
    authState.roles = ['admin']
    const env = createEnv()
    const request = buildRequest({ slug: 'demo', documentId: 'doc-1' })
    const first = await app.fetch(request, env as any)
    expect(first.status).toBe(200)
    const payload = await first.json()
    expect(payload.ok).toBe(true)

    const lookup = await baseEnv.DB.prepare(
      'SELECT content_json, content_html, updated_at FROM editor_documents WHERE slug = ? AND document_id = ? LIMIT 1',
    )
      .bind('demo', 'doc-1')
      .all<{ content_json: string; content_html: string; updated_at: string }>()
    expect(lookup.results?.[0]?.content_json).toContain('"content":[]')
    expect(lookup.results?.[0]?.content_html).toContain('<p')

    const etag = payload.documents?.editor_main?.etag
    expect(typeof etag).toBe('string')

    const nextContent = { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'updated' }] }] }
    const secondReq = buildRequest({ slug: 'demo', documentId: 'doc-1', content: nextContent, etag })
    const second = await app.fetch(secondReq, env as any)
    expect(second.status).toBe(200)
    const secondPayload = await second.json()
    expect(secondPayload.ok).toBe(true)

    const updated = await baseEnv.DB.prepare(
      'SELECT content_json, content_html FROM editor_documents WHERE slug = ? AND document_id = ? LIMIT 1',
    )
      .bind('demo', 'doc-1')
      .all<{ content_json: string; content_html: string }>()
    expect(updated.results?.[0]?.content_json).toContain('updated')
    expect(updated.results?.[0]?.content_html).toContain('<p>')
  })

  it('returns JSON payload suitable for HTMX responses', async () => {
    authState.authenticated = true
    authState.roles = ['admin']
    const env = createEnv()
    const res = await app.fetch(buildRequest({ slug: 'demo', documentId: 'htmx-doc' }), env as any)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json).toEqual(
      expect.objectContaining({
        ok: true,
        documents: {
          editor_main: expect.objectContaining({
            contentId: 'htmx-doc',
            etag: expect.any(String),
          }),
        },
      }),
    )
  })

  it('respects rate limit configuration', async () => {
    authState.authenticated = true
    authState.roles = ['admin']
    const env = createEnv({ AUTH_RATE_LIMIT_MAX: '1', AUTH_RATE_LIMIT_WINDOW_S: '60' })
    const first = await app.fetch(buildRequest({ slug: 'demo', documentId: 'rate-doc' }), env as any)
    expect(first.status).toBe(200)
    const second = await app.fetch(buildRequest({ slug: 'demo', documentId: 'rate-doc' }), env as any)
    expect(second.status).toBe(429)
  })
})
