import type { Bindings } from '../bindings'
import type { PageSectionKind, PageSlug } from '../config/pages'

export type PageStatus = 'preview' | 'published'

export interface PreviewSectionInput {
  kind: PageSectionKind
  pos: number
  configJson?: string | null
  contentHtml?: string | null
  contentJson?: string | null
}

export interface PreviewActivityInput {
  title: string
  pos: number
  imageKey?: string | null
  imageAlt?: string | null
  descriptionHtml?: string | null
  descriptionJson?: string | null
}

export interface PreviewEventInput {
  title: string
  pos: number
  imageKey?: string | null
  imageAlt?: string | null
  startDate?: string | null
  endDate?: string | null
  descriptionHtml?: string | null
  descriptionJson?: string | null
}

export interface PreviewPageInput {
  slug: PageSlug
  title: string
  heroImageKey?: string | null
  donateEnabled: boolean
  sections: PreviewSectionInput[]
  activities: PreviewActivityInput[]
  events: PreviewEventInput[]
}

export interface PreviewPageRecord {
  id: number
  slug: PageSlug
  version: number
  title: string
  heroImageKey: string | null
  donateEnabled: boolean
  status: PageStatus
  createdAt: string
  updatedAt: string
  publishedAt: string | null
}

export interface PreviewSectionRecord extends PreviewSectionInput {
  id: number
  pageId: number
}

export interface PreviewActivityRecord extends PreviewActivityInput {
  id: number
  pageId: number
}

export interface PreviewEventRecord extends PreviewEventInput {
  id: number
  pageId: number
}

export interface PreviewSnapshot {
  page: PreviewPageRecord
  sections: PreviewSectionRecord[]
  activities: PreviewActivityRecord[]
  events: PreviewEventRecord[]
}

const MAX_VERSION_ATTEMPTS = 3

const STATUS_PREVIEW: PageStatus = 'preview'
const STATUS_PUBLISHED: PageStatus = 'published'

function toBoolean(value: number | string | null | undefined): boolean {
  if (typeof value === 'number') return value !== 0
  if (typeof value === 'string') return value === '1' || value.toLowerCase() === 'true'
  return false
}

function nullable(value: string | null | undefined): string | null {
  if (value === undefined || value === null) return null
  const trimmed = value.trim()
  return trimmed.length === 0 ? null : trimmed
}

function isUniqueVersionError(error: unknown): boolean {
  if (!(error instanceof Error)) return false
  const message = error.message ?? ''
  return message.includes('UNIQUE constraint failed') && message.includes('pages.slug')
}

export class PreviewRepo {
  constructor(private readonly env: Bindings) {}

  async saveDraft(input: PreviewPageInput): Promise<PreviewSnapshot> {
    let pageId: number | null = null
    const donateFlag = input.donateEnabled ? 1 : 0

    try {
      const inserted = await this.insertPageWithRetry(input, donateFlag)
      pageId = inserted.id

      await this.env.DB.prepare(
        `DELETE FROM pages
         WHERE slug = ?
           AND status = ?
           AND id != ?`,
      )
        .bind(input.slug, STATUS_PREVIEW, pageId)
        .run()

      for (const section of input.sections) {
        await this.env.DB.prepare(
          `INSERT INTO sections (page_id, kind, pos, config_json, content_html, content_json)
           VALUES (?, ?, ?, ?, ?, ?)`,
        )
          .bind(
            pageId,
            section.kind,
            section.pos,
            nullable(section.configJson ?? null),
            nullable(section.contentHtml ?? null),
            nullable(section.contentJson ?? null),
          )
          .run()
      }

      for (const activity of input.activities) {
        await this.env.DB.prepare(
          `INSERT INTO activities (page_id, title, image_key, image_alt, description_html, description_json, pos)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
        )
          .bind(
            pageId,
            activity.title,
            nullable(activity.imageKey ?? null),
            nullable(activity.imageAlt ?? null),
            nullable(activity.descriptionHtml ?? null),
            nullable(activity.descriptionJson ?? null),
            activity.pos,
          )
          .run()
      }

      for (const event of input.events) {
        await this.env.DB.prepare(
          `INSERT INTO events (page_id, title, image_key, image_alt, start_date, end_date, description_html, description_json, pos)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
          .bind(
            pageId,
            event.title,
            nullable(event.imageKey ?? null),
            nullable(event.imageAlt ?? null),
            nullable(event.startDate ?? null),
            nullable(event.endDate ?? null),
            nullable(event.descriptionHtml ?? null),
            nullable(event.descriptionJson ?? null),
            event.pos,
          )
          .run()
      }

      return (await this.getById(pageId))!
    } catch (error) {
      if (pageId) {
        await this.env.DB.prepare('DELETE FROM pages WHERE id = ?')
          .bind(pageId)
          .run()
          .catch(() => {})
      }
      throw error
    }
  }

  async getLatest(slug: PageSlug): Promise<PreviewSnapshot | null> {
    const { results } = await this.env.DB.prepare(
      `SELECT id, slug, version, title, hero_image_key, donate_enabled, status, created_at, updated_at, published_at
       FROM pages
       WHERE slug = ? AND status = ?
       ORDER BY version DESC
       LIMIT 1`,
    )
      .bind(slug, STATUS_PREVIEW)
      .all<{
        id: number
        slug: PageSlug
        version: number
        title: string
        hero_image_key: string | null
        donate_enabled: number
        status: PageStatus
        created_at: string
        updated_at: string
        published_at: string | null
      }>()

    if (!results || results.length === 0) return null
    return this.loadSnapshot(results[0]!)
  }

  async getById(id: number): Promise<PreviewSnapshot | null> {
    const { results } = await this.env.DB.prepare(
      `SELECT id, slug, version, title, hero_image_key, donate_enabled, status, created_at, updated_at, published_at
       FROM pages
       WHERE id = ?
       LIMIT 1`,
    )
      .bind(id)
      .all<{
        id: number
        slug: PageSlug
        version: number
        title: string
        hero_image_key: string | null
        donate_enabled: number
        status: PageStatus
        created_at: string
        updated_at: string
        published_at: string | null
      }>()

    if (!results || results.length === 0) return null
    return this.loadSnapshot(results[0]!)
  }

  private async insertPageWithRetry(
    input: PreviewPageInput,
    donateFlag: number,
  ): Promise<{ id: number; version: number }> {
    let attempt = 0
    let lastError: unknown = null

    while (attempt < MAX_VERSION_ATTEMPTS) {
      attempt += 1
      try {
        const { results } = await this.env.DB.prepare(
          `INSERT INTO pages (slug, version, title, hero_image_key, donate_enabled, status)
           VALUES (
             ?,
             (SELECT COALESCE(MAX(version), 0) + 1 FROM pages WHERE slug = ?),
             ?, ?, ?, ?
           )
           RETURNING id, version`,
        )
          .bind(input.slug, input.slug, input.title, nullable(input.heroImageKey), donateFlag, STATUS_PREVIEW)
          .all<{ id: number; version: number }>()

        const record = results?.[0]
        if (!record) {
          throw new Error('Failed to capture inserted preview page')
        }
        return record
      } catch (error) {
        lastError = error
        if (isUniqueVersionError(error) && attempt < MAX_VERSION_ATTEMPTS) {
          continue
        }
        throw error
      }
    }

    throw lastError instanceof Error ? lastError : new Error('Failed to insert preview page')
  }

  private async loadSnapshot(row: {
    id: number
    slug: PageSlug
    version: number
    title: string
    hero_image_key: string | null
    donate_enabled: number
    status: PageStatus
    created_at: string
    updated_at: string
    published_at: string | null
  }): Promise<PreviewSnapshot> {
    const page: PreviewPageRecord = {
      id: row.id,
      slug: row.slug,
      version: row.version,
      title: row.title,
      heroImageKey: nullable(row.hero_image_key),
      donateEnabled: toBoolean(row.donate_enabled),
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      publishedAt: row.published_at,
    }

    const sections = await this.loadSections(page.id)
    const activities = await this.loadActivities(page.id)
    const events = await this.loadEvents(page.id)

    return { page, sections, activities, events }
  }

  private async loadSections(pageId: number): Promise<PreviewSectionRecord[]> {
    const { results } = await this.env.DB.prepare(
      `SELECT id, page_id, kind, pos, config_json, content_html, content_json
       FROM sections
       WHERE page_id = ?
       ORDER BY pos ASC, id ASC`,
    )
      .bind(pageId)
      .all<{
        id: number
        page_id: number
        kind: PageSectionKind
        pos: number
        config_json: string | null
        content_html: string | null
        content_json: string | null
      }>()

    return (results ?? []).map((row) => ({
      id: row.id,
      pageId: row.page_id,
      kind: row.kind,
      pos: row.pos,
      configJson: nullable(row.config_json),
      contentHtml: nullable(row.content_html),
      contentJson: nullable(row.content_json),
    }))
  }

  private async loadActivities(pageId: number): Promise<PreviewActivityRecord[]> {
    const { results } = await this.env.DB.prepare(
      `SELECT id, page_id, title, image_key, image_alt, description_html, description_json, pos
       FROM activities
       WHERE page_id = ?
       ORDER BY pos ASC, id ASC`,
    )
      .bind(pageId)
      .all<{
        id: number
        page_id: number
        title: string
        image_key: string | null
        image_alt: string | null
        description_html: string | null
        description_json: string | null
        pos: number
      }>()

    return (results ?? []).map((row) => ({
      id: row.id,
      pageId: row.page_id,
      title: row.title,
      imageKey: nullable(row.image_key),
      imageAlt: nullable(row.image_alt),
      descriptionHtml: nullable(row.description_html),
      descriptionJson: nullable(row.description_json),
      pos: row.pos,
    }))
  }

  private async loadEvents(pageId: number): Promise<PreviewEventRecord[]> {
    const { results } = await this.env.DB.prepare(
      `SELECT id, page_id, title, image_key, image_alt, start_date, end_date, description_html, description_json, pos
       FROM events
       WHERE page_id = ?
       ORDER BY pos ASC, id ASC`,
    )
      .bind(pageId)
      .all<{
        id: number
        page_id: number
        title: string
        image_key: string | null
        image_alt: string | null
        start_date: string | null
        end_date: string | null
        description_html: string | null
        description_json: string | null
        pos: number
      }>()

    return (results ?? []).map((row) => ({
      id: row.id,
      pageId: row.page_id,
      title: row.title,
      imageKey: nullable(row.image_key),
      imageAlt: nullable(row.image_alt),
      startDate: nullable(row.start_date),
      endDate: nullable(row.end_date),
      descriptionHtml: nullable(row.description_html),
      descriptionJson: nullable(row.description_json),
      pos: row.pos,
    }))
  }
}
