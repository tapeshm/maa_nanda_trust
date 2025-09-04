import type { Bindings } from '../bindings'

/**
 * Types representing rows returned from the database.  These correspond
 * directly to the schema defined in `migrations/*.sql`.
 */
export interface ContentRecord {
  id: number
  slug: string
  title: string
  json: string
  created_at: string
  updated_at: string
}

export interface FinanceRecord {
  id: number
  activity: string
  date: string
  type: 'credit' | 'debit'
  amount: number
  contact: string | null
  notes: string | null
  created_at: string
}

export interface MediaRecord {
  id: number
  key: string
  filename: string
  mimetype: string
  size: number
  url: string | null
  uploaded_at: string
}

/**
 * Fetch a single content block by slug.  Returns `null` if no record exists.
 */
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

/**
 * Return all content blocks.  Useful for the admin dashboard.
 */
export async function listContent(env: Bindings): Promise<ContentRecord[]> {
  const { results } = await env.DB.prepare(
    'SELECT id, slug, title, json, created_at, updated_at FROM content_blocks ORDER BY slug',
  ).all<ContentRecord>()
  return results
}

/**
 * Insert or update a content block.  If a row with the same slug exists it
 * will be updated; otherwise a new row is inserted.  The `updated_at`
 * timestamp is always refreshed.
 */
export async function upsertContent(
  env: Bindings,
  slug: string,
  title: string,
  json: string,
): Promise<void> {
  await env.DB.prepare(
    `INSERT INTO content_blocks (slug, title, json, updated_at)
     VALUES (?, ?, ?, CURRENT_TIMESTAMP)
     ON CONFLICT(slug) DO UPDATE SET
       title = excluded.title,
       json = excluded.json,
       updated_at = CURRENT_TIMESTAMP`,
  )
    .bind(slug, title, json)
    .run()
}

/**
 * Delete a content block by slug. No-op if the row does not exist.
 */
export async function deleteContent(env: Bindings, slug: string): Promise<void> {
  await env.DB.prepare('DELETE FROM content_blocks WHERE slug = ?')
    .bind(slug)
    .run()
}

/**
 * Fetch all finance records ordered by date descending.  Returns an empty
 * array when no records exist.
 */
export async function listFinance(env: Bindings): Promise<FinanceRecord[]> {
  const { results } = await env.DB.prepare(
    'SELECT id, activity, date, type, amount, contact, notes, created_at FROM finance ORDER BY date DESC',
  ).all<FinanceRecord>()
  return results
}

/**
 * Insert a new finance record.  The caller must ensure that `type` is
 * either `credit` or `debit` and that `amount` is a number.  Zod
 * validation in the route handlers helps enforce this【949580580081126†L365-L475】.
 */
export async function insertFinance(
  env: Bindings,
  record: Omit<FinanceRecord, 'id' | 'created_at'>,
): Promise<void> {
  await env.DB.prepare(
    `INSERT INTO finance (activity, date, type, amount, contact, notes)
     VALUES (?, ?, ?, ?, ?, ?)`,
  )
    .bind(
      record.activity,
      record.date,
      record.type,
      record.amount,
      record.contact ?? null,
      record.notes ?? null,
    )
    .run()
}

/**
 * Return a list of media metadata sorted by upload time descending.
 */
export async function listMedia(env: Bindings): Promise<MediaRecord[]> {
  const { results } = await env.DB.prepare(
    'SELECT id, key, filename, mimetype, size, url, uploaded_at FROM media ORDER BY uploaded_at DESC',
  ).all<MediaRecord>()
  return results
}

/**
 * Record metadata about a newly uploaded media object.  The `key` must
 * correspond to the object key in R2.  The `url` column can be used to
 * store a public URL or pre‑signed URL; it is optional.
 */
export async function insertMedia(
  env: Bindings,
  data: {
    key: string
    filename: string
    mimetype: string
    size: number
    url?: string | null
  },
): Promise<void> {
  await env.DB.prepare(
    `INSERT INTO media (key, filename, mimetype, size, url) VALUES (?, ?, ?, ?, ?)`,
  )
    .bind(
      data.key,
      data.filename,
      data.mimetype,
      data.size,
      data.url ?? null,
    )
    .run()
}
