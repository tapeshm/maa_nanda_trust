/** @jsxImportSource hono/jsx */
import { describe, it, expect } from 'vitest'
import { Hono } from 'hono'
import { requireAuth, requireAdmin } from '../../src/middleware/auth'
import { renderToString } from 'hono/jsx/dom/server'
import { EditorInstance } from '../../src/templates/components/editor'
import { EDITOR_DATA_ATTRIBUTES } from '../../src/editor/constants'

const {
  root: DATA_ATTR_EDITOR_ROOT,
  hiddenJsonField: DATA_ATTR_EDITOR_HIDDEN_JSON,
  hiddenHtmlField: DATA_ATTR_EDITOR_HIDDEN_HTML,
} = EDITOR_DATA_ATTRIBUTES

describe('pages admin auth integration', () => {
  const app = new Hono()
  app.get('/admin/landing', requireAuth(), requireAdmin, (c) => c.text('admin ok'))
  app.get('/preview/landing', requireAuth(), requireAdmin, (c) => c.text('preview ok'))

  it('redirects unauthenticated GET requests to /login', async () => {
    const req = new Request('http://test.example/admin/landing')
    const res = await app.fetch(req, {} as any)
    expect(res.status).toBe(302)
    expect(res.headers.get('Location')).toBe('/login')

    const previewReq = new Request('http://test.example/preview/landing')
    const previewRes = await app.fetch(previewReq, {} as any)
    expect(previewRes.status).toBe(302)
    expect(previewRes.headers.get('Location')).toBe('/login')
  })

  it('returns 401 HX-Redirect for unauthorized HTMX requests', async () => {
    const req = new Request('http://test.example/admin/landing', {
      headers: { 'HX-Request': 'true' },
    })
    const res = await app.fetch(req, {} as any)
    expect(res.status).toBe(401)
    expect(res.headers.get('HX-Redirect')).toBe('/login')

    const previewReq = new Request('http://test.example/preview/landing', {
      headers: { 'HX-Request': 'true' },
    })
    const previewRes = await app.fetch(previewReq, {} as any)
    expect(previewRes.status).toBe(401)
    expect(previewRes.headers.get('HX-Redirect')).toBe('/login')
  })
})

describe('pages editor integration contract', () => {
  it('renders editor mount point and hidden content fields', () => {
    const markup = renderToString(
      <EditorInstance
        spec={{ id: 'page_body' }}
        html="<p>Hello world</p>"
        payload={{ type: 'doc', content: [] }}
      />,
    )

    expect(markup).toContain(DATA_ATTR_EDITOR_ROOT.attr)
    expect(markup).toContain(`${DATA_ATTR_EDITOR_HIDDEN_JSON.attr}="page_body"`)
    expect(markup).toContain(`${DATA_ATTR_EDITOR_HIDDEN_HTML.attr}="page_body"`)
    expect(markup).toMatch(/name="content_json\[page_body]"/)
    expect(markup).toMatch(/name="content_html\[page_body]"/)
  })
})
