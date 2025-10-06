import { describe, it, expect, beforeEach } from 'vitest'
import { createApp, createEnv, buildRequest, authState, resetEditorDocuments, baseEnv } from './save-content.setup'

describe('admin save content conflict handling', () => {
  const app = createApp()

  beforeEach(async () => {
    authState.authenticated = true
    authState.roles = ['admin']
    await resetEditorDocuments()
  })

  it('returns 409 when etag is stale', async () => {
    const env = createEnv()
    const initial = await app.fetch(buildRequest({ slug: 'demo', documentId: 'doc-1' }), env as any)
    expect(initial.status).toBe(200)
    const initialJson = await initial.json()
    const staleEtag = initialJson.documents.editor_main.etag as string

    const updatedContent = {
      type: 'doc',
      content: [{ type: 'paragraph', content: [{ type: 'text', text: 'second update' }] }],
    }
    const second = await app.fetch(
      buildRequest({ slug: 'demo', documentId: 'doc-1', content: updatedContent, etag: staleEtag }),
      env as any,
    )
    expect(second.status).toBe(200)

    await baseEnv.DB.prepare(
      "UPDATE editor_documents SET updated_at = DATETIME(updated_at, '+1 second') WHERE slug = ? AND document_id = ?",
    )
      .bind('demo', 'doc-1')
      .run()
    const latest = await baseEnv.DB.prepare(
      'SELECT updated_at FROM editor_documents WHERE slug = ? AND document_id = ? LIMIT 1',
    )
      .bind('demo', 'doc-1')
      .all<{ updated_at: string }>()
    const currentEtag = latest.results?.[0]?.updated_at as string

    const conflictRes = await app.fetch(
      buildRequest({ slug: 'demo', documentId: 'doc-1', content: updatedContent, etag: staleEtag }),
      env as any,
    )
    expect(conflictRes.status).toBe(409)
    const conflictJson = await conflictRes.json()
    expect(conflictJson).toEqual(
      expect.objectContaining({
        ok: false,
        conflicts: {
          editor_main: {
            etag: currentEtag,
          },
        },
      }),
    )
  })
})
