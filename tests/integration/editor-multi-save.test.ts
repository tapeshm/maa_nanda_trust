import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

import app from '../../src/index'
import { resetEditorDocuments } from '../admin/save-content.setup'
import {
  ADMIN_ORIGIN,
  buildCookieHeader,
  createIntegrationEnv,
  issueAdminToken,
} from './editor.helpers'

describe('editor multi-editor form persistence', () => {
  beforeEach(async () => {
    await resetEditorDocuments()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('persists multiple editors and renders each document', async () => {
    const env = createIntegrationEnv()
    const { token, fetchSpy } = await issueAdminToken(['admin'])
    const cookies: Record<string, string> = {
      '__Host-access_token': token,
      '__Host-csrf': 'csrf-token',
    }

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

    const setupHeaders = new Headers({
      Cookie: buildCookieHeader(cookies),
      'cf-connecting-ip': '2.2.2.2',
      Host: 'admin.example.com',
    })

    const setupRes = await app.fetch(
      new Request(`${ADMIN_ORIGIN}/admin/demo/flow`, {
        method: 'GET',
        headers: setupHeaders,
      }),
      env as any,
    )

    const initialStatus = setupRes.status
    let activeSetupResponse = setupRes
    if (initialStatus === 302) {
      const location = setupRes.headers.get('Location')
      expect(location).toBeTruthy()
      const followUrl = new URL(location!, ADMIN_ORIGIN).toString()
      activeSetupResponse = await app.fetch(
        new Request(followUrl, {
          method: 'GET',
          headers: setupHeaders,
        }),
        env as any,
      )
    }

    expect(activeSetupResponse.status).toBe(200)
    const setCookieHeader = activeSetupResponse.headers.get('Set-Cookie')
    if (setCookieHeader) {
      const csrfMatch = setCookieHeader.match(/__Host-csrf=([^;]+)/)
      if (csrfMatch) {
        cookies['__Host-csrf'] = csrfMatch[1]
      }
    }
    logSpy.mockClear()

    const mainContent = {
      type: 'doc',
      content: [
        { type: 'paragraph', content: [{ type: 'text', text: 'Main body copy' }] },
      ],
    }
    const asideContent = {
      type: 'doc',
      content: [
        { type: 'paragraph', content: [{ type: 'text', text: 'Sidebar information' }] },
      ],
    }

    const formData = new FormData()
    formData.set('slug', 'demo')
    formData.set('content_json[editor_main]', JSON.stringify(mainContent))
    formData.set('content_html[editor_main]', '<p>Main body copy</p>')
    formData.set('document_id[editor_main]', 'main')
    formData.set('profile[editor_main]', 'full')

    formData.set('content_json[editor_sidebar]', JSON.stringify(asideContent))
    formData.set('content_html[editor_sidebar]', '<p>Sidebar information</p>')
    formData.set('document_id[editor_sidebar]', 'sidebar')
    formData.set('profile[editor_sidebar]', 'basic')

    const postHeaders = new Headers({
      Cookie: buildCookieHeader(cookies),
      'cf-connecting-ip': '2.2.2.2',
      Host: 'admin.example.com',
      Origin: ADMIN_ORIGIN,
      'X-CSRF-Token': cookies['__Host-csrf'],
      'HX-CSRF-Token': cookies['__Host-csrf'],
    })

    const saveRes = await app.fetch(
      new Request(`${ADMIN_ORIGIN}/admin/save-content`, {
        method: 'POST',
        headers: postHeaders,
        body: formData,
      }),
      env as any,
    )

    expect(saveRes.status).toBe(200)
    const payload = await saveRes.json()
    expect(payload.ok).toBe(true)

    const saveEvents = logSpy.mock.calls
      .map(([entry]) => entry)
      .filter((entry): entry is Record<string, unknown> => Boolean(entry && typeof entry === 'object'))
      .filter((entry) => entry.event === 'editor.save.ok')
    expect(saveEvents).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ documentId: 'main', outcome: 'ok' }),
        expect.objectContaining({ documentId: 'sidebar', outcome: 'ok' }),
      ]),
    )

    const { results } = await env.DB.prepare(
      'SELECT document_id, content_html FROM editor_documents WHERE slug = ? ORDER BY document_id',
    )
      .bind('demo')
      .all<{ document_id: string; content_html: string }>()

    const ids = results?.map((row) => row.document_id) ?? []
    expect(ids).toEqual(expect.arrayContaining(['main', 'sidebar']))

    const publicMain = await app.fetch(
      new Request('https://example.com/demo/main', {
        headers: { Host: 'example.com' },
      }),
      env as any,
    )
    expect(publicMain.status).toBe(200)
    expect(await publicMain.text()).toContain('Main body copy')

    const publicSidebar = await app.fetch(
      new Request('https://example.com/demo/sidebar', {
        headers: { Host: 'example.com' },
      }),
      env as any,
    )
    expect(publicSidebar.status).toBe(200)
    expect(await publicSidebar.text()).toContain('Sidebar information')

    fetchSpy.mockRestore()
    logSpy.mockRestore()
  })
})
