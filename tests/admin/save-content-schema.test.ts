import { describe, it, expect, beforeEach } from 'vitest'
import { createApp, createEnv, buildRequest, authState, resetEditorDocuments } from './save-content.setup'

describe('admin save content schema validation', () => {
  const app = createApp()

  beforeEach(async () => {
    authState.authenticated = true
    authState.roles = ['admin']
    await resetEditorDocuments()
  })

  it('rejects payloads with disallowed node types', async () => {
    const env = createEnv()
    const content = {
      type: 'doc',
      content: [{ type: 'script', content: [] }],
    }
    const res = await app.fetch(buildRequest({ slug: 'demo', content }), env as any)
    expect(res.status).toBe(422)
  })

  it('rejects payloads missing content array', async () => {
    const env = createEnv()
    const content = { type: 'doc' }
    const res = await app.fetch(buildRequest({ slug: 'demo', content }), env as any)
    expect(res.status).toBe(422)
  })

  it('rejects HTML with disallowed tags', async () => {
    const env = createEnv()
    const content = {
      type: 'doc',
      content: [{ type: 'paragraph', content: [{ type: 'text', text: 'hello' }] }],
    }
    const res = await app.fetch(
      buildRequest({ slug: 'demo', content, html: '<script>alert(1)</script>' }),
      env as any,
    )
    expect(res.status).toBe(422)
  })

  it('rejects HTML containing inline style attributes', async () => {
    const env = createEnv()
    const content = {
      type: 'doc',
      content: [{ type: 'paragraph', content: [{ type: 'text', text: 'hello' }] }],
    }
    const res = await app.fetch(
      buildRequest({ slug: 'demo', content, html: '<p style="color:red">hello</p>' }),
      env as any,
    )
    expect(res.status).toBe(422)
  })

  it('rejects anchors with javascript href protocols', async () => {
    const env = createEnv()
    const content = {
      type: 'doc',
      content: [{ type: 'paragraph', content: [{ type: 'text', text: 'hello' }] }],
    }
    const res = await app.fetch(
      buildRequest({
        slug: 'demo',
        content,
        html: '<p><a href="javascript:alert(1)">link</a></p>',
      }),
      env as any,
    )
    expect(res.status).toBe(422)
  })

  it('rejects anchors targeting blank without rel safeguards', async () => {
    const env = createEnv()
    const content = {
      type: 'doc',
      content: [{ type: 'paragraph', content: [{ type: 'text', text: 'hello' }] }],
    }
    const res = await app.fetch(
      buildRequest({
        slug: 'demo',
        content,
        html: '<p><a href="https://example.com" target="_blank">external</a></p>',
      }),
      env as any,
    )
    expect(res.status).toBe(422)
  })
})
