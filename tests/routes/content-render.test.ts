import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { Hono } from 'hono'

import type { Bindings } from '../../src/bindings'
import content from '../../src/routes/content'
import { env as baseEnv } from 'cloudflare:test'

function createApp() {
  const app = new Hono<{ Bindings: Bindings }>()
  app.route('/', content)
  return app
}

async function resetDocuments() {
  await baseEnv.DB.prepare('DELETE FROM editor_documents').run()
}

async function seedDocument(options: {
  slug: string
  documentId: string
  profile?: string
  contentJson: string
  contentHtml?: string
}) {
  const { slug, documentId, profile = 'basic', contentJson, contentHtml = '' } = options
  await baseEnv.DB.prepare(
    `INSERT INTO editor_documents (slug, document_id, profile, content_json, content_html, updated_at)
     VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
  )
    .bind(slug, documentId, profile, contentJson, contentHtml)
    .run()
}

function request(path: string) {
  return new Request(`https://example.com${path}`, {
    headers: {
      Host: 'example.com',
    },
  })
}

beforeEach(async () => {
  await resetDocuments()
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('public content rendering', () => {
  it('renders stored document HTML', async () => {
    await seedDocument({
      slug: 'demo',
      documentId: '1',
      contentJson: JSON.stringify({
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [{ type: 'text', text: 'Hello world' }],
          },
        ],
      }),
      contentHtml: '<p>Hello world</p>',
    })

    const app = createApp()
    const res = await app.fetch(request('/demo/1'), baseEnv as any)
    expect(res.status).toBe(200)
    const body = await res.text()
    expect(body).toContain('Hello world')
    // [D3:editor-tiptap.step-11:test-update] Updated to check for namespaced content-prose class
    expect(body).toContain('class="content-prose prose')
  })

  it('returns 404 for missing documents', async () => {
    const app = createApp()
    const res = await app.fetch(request('/unknown/999'), baseEnv as any)
    expect(res.status).toBe(404)
  })

  it('renders safe empty output when JSON is corrupt', async () => {
    await seedDocument({
      slug: 'demo',
      documentId: 'broken',
      contentJson: '{ "not": "json"',
      contentHtml: '',
    })

    const app = createApp()
    const res = await app.fetch(request('/demo/broken'), baseEnv as any)
    expect(res.status).toBe(200)
    const body = await res.text()
    expect(body).toContain('<p')
  })

  it('logs warning and strips unsafe nodes for invalid shape', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})

    await seedDocument({
      slug: 'demo',
      documentId: 'unsafe',
        contentJson: JSON.stringify({
          type: 'doc',
          content: [
            {
              type: 'image',
              attrs: {
                src: 'https://evil.example.com/image.png',
                alt: 'bad',
              },
            },
            {
              type: 'unknownNode',
              content: [],
            },
          ],
        }),
        contentHtml: '<img src="https://evil.example.com/image.png" alt="bad" />',
      })

    const app = createApp()
    const res = await app.fetch(request('/demo/unsafe'), baseEnv as any)
    expect(res.status).toBe(200)
    const body = await res.text()
    expect(body).not.toContain('evil.example.com')
    expect(body).toContain('<p')

    expect(warn).toHaveBeenCalled()
    const payloads = warn.mock.calls.map(([arg]) => arg)
    expect(payloads).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ event: 'editor.render.warning', reason: expect.any(String) }),
      ]),
    )
  })

  it('regenerates HTML from stored JSON when stored markup fails validation', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})

    await seedDocument({
      slug: 'demo',
      documentId: 'regen',
      contentJson: JSON.stringify({
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [{ type: 'text', text: 'Recovered from JSON' }],
          },
        ],
      }),
      contentHtml: '<script>alert(1)</script>',
    })

    const app = createApp()
    const res = await app.fetch(request('/demo/regen'), baseEnv as any)
    expect(res.status).toBe(200)
    const body = await res.text()
    expect(body).toContain('Recovered from JSON')
    // [D3:editor-tiptap.step-11:test-update] Updated to check for namespaced content-prose class
    expect(body).toContain('class="content-prose prose')

    expect(warn).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'editor.render.warning',
        reason: 'stored_html_invalid',
        documentId: 'regen',
      }),
    )
  })
})
