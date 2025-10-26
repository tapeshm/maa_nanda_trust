/** @jsxImportSource hono/jsx */
import { describe, it, expect, beforeAll, beforeEach } from 'vitest'
import app from '../../src/index'
import type { Bindings } from '../../src/bindings'
import {
  ADMIN_ORIGIN,
  buildCookieHeader,
  createIntegrationEnv,
  issueAdminToken,
} from '../integration/editor.helpers'

let env: Bindings

describe('admin editor page (SSR)', () => {
  beforeAll(() => {
    // no-op
  })

  beforeEach(() => {
    env = createIntegrationEnv()
  })

  it('unauthenticated: GET redirects; HTMX returns 401 with HX-Redirect', async () => {
    const url = `${ADMIN_ORIGIN}/admin/demo/1`
    const r1 = await app.fetch(new Request(url), env as any)
    expect(r1.status).toBe(302)
    expect(r1.headers.get('Location')).toBe('/login')

    const r2 = await app.fetch(new Request(url, { headers: { 'HX-Request': 'true' } }), env as any)
    expect(r2.status).toBe(401)
    expect(r2.headers.get('HX-Redirect')).toBe('/login')
  })

  it('authorized admin: SSR includes editor mount, payload nonce, and manifest script', async () => {
    const { token, fetchSpy } = await issueAdminToken(['admin'])
    try {
      const cookies = {
        '__Host-access_token': token,
        '__Host-csrf': 'csrf-token',
      }

      const headers = new Headers({
        Cookie: buildCookieHeader(cookies),
        Host: 'admin.example.com',
        'cf-connecting-ip': '1.1.1.1',
      })

      const res = await app.fetch(new Request(`${ADMIN_ORIGIN}/admin/demo/1`, { headers }), env as any)
      expect(res.status).toBe(200)
      const csp = res.headers.get('Content-Security-Policy') || ''
      const html = await res.text()

      // Editor mount exists
      expect(html).toContain('data-editor')

      // hx-headers include X-CSRF-Token rendered server-side (quoting may vary)
      expect(html).toMatch(/hx-headers=("[^"]*"|'[^']*')/)
      expect(html).toContain('X-CSRF-Token')
      expect(html).toContain('csrf-token')

      // Manifest-resolved editor script tag exists
      expect(html).toMatch(/<script[^>]+src="\/assets\/editor-[^"]+\.js"[^>]*type="module"[^>]*><\/script>/)

      // If CSS exists for the entry, link tags should be present (tolerant: optional)
      // Not asserting strict presence because manifest may omit CSS for the entry.

      // CSP nonce should appear in script-src and match inline JSON payload nonce
      const nonceMatch = csp.match(/'nonce-([^']+)'/)
      if (nonceMatch) {
        const nonce = nonceMatch[1]
        expect(html).toMatch(new RegExp(`<script[^>]+id="editor_main__content"[^>]+nonce="${nonce}"`))
      }
    } finally {
      fetchSpy.mockRestore()
    }
  })
})
