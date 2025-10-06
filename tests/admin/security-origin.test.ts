import { describe, it, expect, beforeEach } from 'vitest'
import { Hono } from 'hono'

import uploadRoute from '../../src/routes/admin/upload'
import { createApp, createEnv, buildRequest, authState, resetEditorDocuments } from './save-content.setup'
import {
  ADMIN_ORIGIN,
  buildCookieHeader,
  createIntegrationEnv,
  createTestKv,
  createTestR2,
  issueAdminToken,
} from '../integration/editor.helpers'

describe('admin save content security checks', () => {
  const app = createApp()

  beforeEach(async () => {
    authState.authenticated = true
    authState.roles = ['admin']
    await resetEditorDocuments()
  })

  it('rejects mismatched Origin header', async () => {
    const env = createEnv()
    const res = await app.fetch(buildRequest({ slug: 'demo', origin: 'https://evil.example.com' }), env as any)
    expect(res.status).toBe(403)
  })

  it('returns 413 when payload exceeds configured limit', async () => {
    const env = createEnv({ CONTENT_MAX_BYTES: '10' })
    const content = { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'too large' }] }] }
    const res = await app.fetch(buildRequest({ slug: 'demo', content }), env as any)
    expect(res.status).toBe(413)
  })

  it('returns 403 when CSRF token missing for upload-image', async () => {
    const uploadApp = new Hono<{ Bindings: IntegrationBindings }>()
    uploadApp.route('/admin', uploadRoute)

    const env = createIntegrationEnv({
      R2: createTestR2(),
      KV: createTestKv(),
    })

    const { token, fetchSpy } = await issueAdminToken(['admin'])

    const formData = new FormData()
    formData.append('image', new File([new Uint8Array([0xff])], 'test.png', { type: 'image/png' }))

    const headers = new Headers({
      Cookie: buildCookieHeader({ '__Host-access_token': token }),
      'cf-connecting-ip': '3.3.3.3',
      Host: 'admin.example.com',
      Origin: ADMIN_ORIGIN,
    })

    const res = await uploadApp.fetch(
      new Request(`${ADMIN_ORIGIN}/admin/upload-image`, {
        method: 'POST',
        headers,
        body: formData,
      }),
      env as any,
    )

    expect(res.status).toBe(403)
    fetchSpy.mockRestore()
  })
})
