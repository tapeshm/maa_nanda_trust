import type { Bindings } from '../bindings'

export interface EditorDocumentRow {
  slug: string
  document_id: string
  profile: string
  content_json: string
  content_html: string
  updated_at: string
}

export interface EditorDocumentRecord {
  slug: string
  documentId: string
  profile: string
  contentJson: string
  contentHtml: string
  updatedAt: string
}

function mapRow(row: EditorDocumentRow): EditorDocumentRecord {
  return {
    slug: row.slug,
    documentId: row.document_id,
    profile: row.profile,
    contentJson: row.content_json,
    contentHtml: row.content_html,
    updatedAt: row.updated_at,
  }
}

function normalizeKey(value: string | null | undefined): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

export async function getEditorDocument(
  env: Bindings,
  slug: string,
  documentId: string,
): Promise<EditorDocumentRecord | null> {
  const normalizedSlug = normalizeKey(slug)
  const normalizedDocumentId = normalizeKey(documentId)

  if (!normalizedSlug || !normalizedDocumentId) {
    return null
  }

  const stmt = env.DB.prepare(
    'SELECT slug, document_id, profile, content_json, content_html, updated_at FROM editor_documents WHERE slug = ? AND document_id = ? LIMIT 1',
  )
  const { results } = await stmt.bind(normalizedSlug, normalizedDocumentId).all<EditorDocumentRow>()
  if (!Array.isArray(results) || results.length === 0) {
    return null
  }
  return mapRow(results[0])
}

export async function listEditorDocuments(env: Bindings, slug: string): Promise<EditorDocumentRecord[]> {
  const normalizedSlug = normalizeKey(slug)
  if (!normalizedSlug) {
    return []
  }

  const stmt = env.DB.prepare(
    'SELECT slug, document_id, profile, content_json, content_html, updated_at FROM editor_documents WHERE slug = ? ORDER BY document_id',
  )
  const { results } = await stmt.bind(normalizedSlug).all<EditorDocumentRow>()
  if (!Array.isArray(results)) return []
  return results.map(mapRow)
}

export async function upsertEditorDocument(
  env: Bindings,
  payload: {
    slug: string
    documentId: string
    profile: string
    contentJson: string
    contentHtml: string
    ifMatch?: string | null
  },
): Promise<EditorDocumentRecord> {
  const { slug, documentId, profile, contentJson, contentHtml, ifMatch } = payload

  if (ifMatch) {
    const current = await getEditorDocument(env, slug, documentId)
    if (!current) {
      const err = new Error('Document not found')
      ;(err as any).status = 404
      throw err
    }
    if (current.updatedAt !== ifMatch) {
      const err = new Error('Conflict')
      ;(err as any).status = 409
      throw err
    }
  }

  const stmt = env.DB.prepare(
    `INSERT INTO editor_documents (slug, document_id, profile, content_json, content_html, updated_at)
      VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(slug, document_id) DO UPDATE SET
        profile = excluded.profile,
        content_json = excluded.content_json,
        content_html = excluded.content_html,
        updated_at = CURRENT_TIMESTAMP
      RETURNING slug, document_id, profile, content_json, content_html, updated_at`,
  )

  const { results } = await stmt
    .bind(slug, documentId, profile, contentJson, contentHtml)
    .all<EditorDocumentRow>()
  if (!Array.isArray(results) || results.length === 0) {
    throw new Error('Failed to save editor document')
  }

  return mapRow(results[0])
}
