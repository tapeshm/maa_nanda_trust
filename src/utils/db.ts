import type { Bindings } from '../bindings'

export interface ContentRecord {
  id: number
  slug: string
  title: string
  json: string
  created_at: string
  updated_at: string
}

export async function getContent(
  env: Bindings,
  slug: string,
): Promise<ContentRecord | null> {
  const stmt = env.DB.prepare(
    'SELECT id, slug, title, json, created_at, updated_at FROM content_blocks WHERE slug = ? LIMIT 1',
  )
  const { results } = await stmt.bind(slug).all<ContentRecord>()
  return results.length > 0 ? results[0] : null
}

export async function listContent(env: Bindings): Promise<ContentRecord[]> {
  const { results } = await env.DB.prepare(
    'SELECT id, slug, title, json, created_at, updated_at FROM content_blocks ORDER BY slug',
  ).all<ContentRecord>()
  return results
}

export async function upsertContent(
  env: Bindings,
  slug: string,
  title: string,
  json: string,
): Promise<void> {
  await env.DB.prepare(
    `INSERT INTO content_blocks (slug, title, json, updated_at)`
      + ' VALUES (?, ?, ?, CURRENT_TIMESTAMP)'
      + ' ON CONFLICT(slug) DO UPDATE SET'
      + '   title = excluded.title,'
      + '   json = excluded.json,'
      + '   updated_at = CURRENT_TIMESTAMP',
  )
    .bind(slug, title, json)
    .run()
}

export async function deleteContent(env: Bindings, slug: string): Promise<void> {
  await env.DB.prepare('DELETE FROM content_blocks WHERE slug = ?')
    .bind(slug)
    .run()
}