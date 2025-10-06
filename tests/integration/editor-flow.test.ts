import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

import app from '../../src/index'
import { resetEditorDocuments } from '../admin/save-content.setup'
import {
  ADMIN_ORIGIN,
  buildCookieHeader,
  createIntegrationEnv,
  issueAdminToken,
} from './editor.helpers'

describe('editor end-to-end flow', () => {
  beforeEach(async () => {
    await resetEditorDocuments()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('allows admin to edit and view content end-to-end', async () => {
    const env = createIntegrationEnv()
    const { token, fetchSpy } = await issueAdminToken(['admin'])
    const cookies: Record<string, string> = {
      '__Host-access_token': token,
      '__Host-csrf': 'csrf-token',
    }

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

    const adminGetHeaders = new Headers({
      Cookie: buildCookieHeader(cookies),
      'cf-connecting-ip': '1.1.1.1',
      Host: 'admin.example.com',
    })

    const adminRes = await app.fetch(
      new Request(`${ADMIN_ORIGIN}/admin/demo/1`, {
        method: 'GET',
        headers: adminGetHeaders,
      }),
      env as any,
    )

    let activeAdminResponse = adminRes
    if (adminRes.status === 302) {
      const location = adminRes.headers.get('Location')
      expect(location).toBeTruthy()
      const followUrl = new URL(location!, ADMIN_ORIGIN).toString()
      activeAdminResponse = await app.fetch(
        new Request(followUrl, {
          method: 'GET',
          headers: adminGetHeaders,
        }),
        env as any,
      )
    }

    expect(activeAdminResponse.status).toBe(200)
    const setCookieHeader = activeAdminResponse.headers.get('Set-Cookie')
    if (setCookieHeader) {
      const csrfMatch = setCookieHeader.match(/__Host-csrf=([^;]+)/)
      if (csrfMatch) {
        cookies['__Host-csrf'] = csrfMatch[1]
      }
    }

    const adminHtml = await activeAdminResponse.text()
    expect(adminHtml).toContain('data-editor')

    const mountEvents = logSpy.mock.calls
      .map(([entry]) => entry)
      .filter((entry): entry is Record<string, unknown> => Boolean(entry && typeof entry === 'object'))
      .filter((entry) => entry.event === 'editor.mount')
    expect(mountEvents.length).toBeGreaterThan(0)
    logSpy.mockClear()

    const payload = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'Recovered content from integration test' }],
        },
      ],
    }

    const formData = new FormData()
    formData.set('slug', 'demo')
    formData.set('content_json[editor_main]', JSON.stringify(payload))
    formData.set('content_html[editor_main]', '<p>Recovered content from integration test</p>')
    formData.set('document_id[editor_main]', '1')
    formData.set('profile[editor_main]', 'full')

    const adminPostHeaders = new Headers({
      Cookie: buildCookieHeader(cookies),
      'cf-connecting-ip': '1.1.1.1',
      Host: 'admin.example.com',
      Origin: ADMIN_ORIGIN,
      'X-CSRF-Token': cookies['__Host-csrf'],
      'HX-CSRF-Token': cookies['__Host-csrf'],
    })

    const saveRes = await app.fetch(
      new Request(`${ADMIN_ORIGIN}/admin/save-content`, {
        method: 'POST',
        headers: adminPostHeaders,
        body: formData,
      }),
      env as any,
    )

    expect(saveRes.status).toBe(200)
    const saveJson = await saveRes.json()
    expect(saveJson.ok).toBe(true)

    const saveEvents = logSpy.mock.calls
      .map(([entry]) => entry)
      .filter((entry): entry is Record<string, unknown> => Boolean(entry && typeof entry === 'object'))
      .filter((entry) => entry.event === 'editor.save.ok')
    expect(saveEvents).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ slug: 'demo', documentId: '1', outcome: 'ok' }),
      ]),
    )
    logSpy.mockClear()

    const publicRes = await app.fetch(
      new Request('https://example.com/demo/1', {
        headers: { Host: 'example.com' },
      }),
      env as any,
    )

    expect(publicRes.status).toBe(200)
    const publicHtml = await publicRes.text()
    expect(publicHtml).toContain('Recovered content from integration test')

    const { results } = await env.DB.prepare(
      'SELECT content_json, content_html FROM editor_documents WHERE slug = ? AND document_id = ?',
    )
      .bind('demo', '1')
      .all<{ content_json: string; content_html: string }>()

    expect(results?.[0]?.content_json).toContain('Recovered content from integration test')
    expect(results?.[0]?.content_html).toContain('Recovered content from integration test')

    fetchSpy.mockRestore()
    logSpy.mockRestore()
  })
})
