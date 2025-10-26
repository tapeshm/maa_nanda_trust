import type { Bindings } from '../bindings'
import type { PageSlug, PageSectionKind } from '../config/pages'
import type { PreviewSnapshot, PageStatus } from './previewRepo'

export interface PublishPageRecord {
  id: number
  slug: PageSlug
  version: number
  title: string
  heroImageKey: string | null
  donateEnabled: boolean
  createdAt: string
  updatedAt: string
  publishedAt: string
}

export interface PublishSectionRecord {
  id: number
  pageId: number
  kind: PageSectionKind
  pos: number
  configJson: string | null
  contentHtml: string | null
}

export interface PublishActivityRecord {
  id: number
  pageId: number
  title: string
  pos: number
  imageKey: string | null
  imageAlt: string | null
  descriptionHtml: string | null
}

export interface PublishEventRecord {
  id: number
  pageId: number
  title: string
  pos: number
  imageKey: string | null
  imageAlt: string | null
  startDate: string | null
  endDate: string | null
  descriptionHtml: string | null
}

export interface PublishSnapshot {
  page: PublishPageRecord
  sections: PublishSectionRecord[]
  activities: PublishActivityRecord[]
  events: PublishEventRecord[]
}

const STATUS_PUBLISHED: PageStatus = 'published'

function nullable(value: string | null | undefined): string | null {
  if (value === undefined || value === null) return null
  const trimmed = value.trim()
  return trimmed.length === 0 ? null : trimmed
}

function toBoolean(value: number | string | null | undefined): boolean {
  if (typeof value === 'number') return value !== 0
  if (typeof value === 'string') return value === '1' || value.toLowerCase() === 'true'
  return false
}

export class PublishRepo {
  constructor(private readonly env: Bindings) {}

  async publishFromPreview(snapshot: PreviewSnapshot): Promise<PublishSnapshot> {
    const donateFlag = snapshot.page.donateEnabled ? 1 : 0

    await this.env.DB.prepare(
      `UPDATE pages
       SET status = ?,
           title = ?,
           hero_image_key = ?,
           donate_enabled = ?,
           updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now'),
           published_at = strftime('%Y-%m-%dT%H:%M:%fZ','now')
       WHERE id = ?`,
    )
      .bind(
        STATUS_PUBLISHED,
        snapshot.page.title,
        nullable(snapshot.page.heroImageKey),
        donateFlag,
        snapshot.page.id,
      )
      .run()

    await this.clearPublishedChildren(snapshot.page.id)
    await this.copySections(snapshot.page.id, snapshot)
    await this.copyActivities(snapshot.page.id, snapshot)
    await this.copyEvents(snapshot.page.id, snapshot)

    return (await this.getById(snapshot.page.id))!
  }

  async getById(id: number): Promise<PublishSnapshot | null> {
    const { results } = await this.env.DB.prepare(
      `SELECT id, slug, version, title, hero_image_key, donate_enabled, created_at, updated_at, published_at
       FROM pages
       WHERE id = ? AND status = ?
       LIMIT 1`,
    )
      .bind(id, STATUS_PUBLISHED)
      .all<{
        id: number
        slug: PageSlug
        version: number
        title: string
        hero_image_key: string | null
        donate_enabled: number
        created_at: string
        updated_at: string
        published_at: string
      }>()

    if (!results || results.length === 0) return null
    return this.loadSnapshot(results[0]!)
  }

  private async clearPublishedChildren(pageId: number): Promise<void> {
    await this.env.DB.prepare('DELETE FROM sections WHERE page_id = ?').bind(pageId).run()
    await this.env.DB.prepare('DELETE FROM activities WHERE page_id = ?').bind(pageId).run()
    await this.env.DB.prepare('DELETE FROM events WHERE page_id = ?').bind(pageId).run()
  }

  private async copySections(targetPageId: number, snapshot: PreviewSnapshot): Promise<void> {
    for (const section of snapshot.sections) {
      await this.env.DB.prepare(
        `INSERT INTO sections (page_id, kind, pos, config_json, content_html, content_json)
         VALUES (?, ?, ?, ?, ?, NULL)`,
      )
        .bind(
          targetPageId,
          section.kind,
          section.pos,
          nullable(section.configJson),
          nullable(section.contentHtml),
        )
        .run()
    }
  }

  private async copyActivities(targetPageId: number, snapshot: PreviewSnapshot): Promise<void> {
    for (const activity of snapshot.activities) {
      await this.env.DB.prepare(
        `INSERT INTO activities (page_id, title, pos, image_key, image_alt, description_html, description_json)
         VALUES (?, ?, ?, ?, ?, ?, NULL)`,
      )
        .bind(
          targetPageId,
          activity.title,
          activity.pos,
          nullable(activity.imageKey),
          nullable(activity.imageAlt),
          nullable(activity.descriptionHtml),
        )
        .run()
    }
  }

  private async copyEvents(targetPageId: number, snapshot: PreviewSnapshot): Promise<void> {
    for (const event of snapshot.events) {
      await this.env.DB.prepare(
        `INSERT INTO events (page_id, title, pos, image_key, image_alt, start_date, end_date, description_html, description_json)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL)`,
      )
        .bind(
          targetPageId,
          event.title,
          event.pos,
          nullable(event.imageKey),
          nullable(event.imageAlt),
          nullable(event.startDate),
          nullable(event.endDate),
          nullable(event.descriptionHtml),
        )
        .run()
    }
  }

  async getLatestForSlug(slug: PageSlug): Promise<PublishSnapshot | null> {
    const { results } = await this.env.DB.prepare(
      `SELECT id, slug, version, title, hero_image_key, donate_enabled, created_at, updated_at, published_at
       FROM pages
       WHERE slug = ? AND status = ?
       ORDER BY version DESC
       LIMIT 1`,
    )
      .bind(slug, STATUS_PUBLISHED)
      .all<{
        id: number
        slug: PageSlug
        version: number
        title: string
        hero_image_key: string | null
        donate_enabled: number
        created_at: string
        updated_at: string
        published_at: string
      }>()

    if (!results || results.length === 0) return null
    return this.loadSnapshot(results[0]!)
  }

  private async loadSnapshot(row: {
    id: number
    slug: PageSlug
    version: number
    title: string
    hero_image_key: string | null
    donate_enabled: number
    created_at: string
    updated_at: string
    published_at: string
  }): Promise<PublishSnapshot> {
    const page: PublishPageRecord = {
      id: row.id,
      slug: row.slug,
      version: row.version,
      title: row.title,
      heroImageKey: nullable(row.hero_image_key),
      donateEnabled: toBoolean(row.donate_enabled),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      publishedAt: row.published_at,
    }

    const sections = await this.loadSections(page.id)
    const activities = await this.loadActivities(page.id)
    const events = await this.loadEvents(page.id)

    return { page, sections, activities, events }
  }

  private async loadSections(pageId: number): Promise<PublishSectionRecord[]> {
    const { results } = await this.env.DB.prepare(
      `SELECT id, page_id, kind, pos, config_json, content_html
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
      }>()

    return (results ?? []).map((row) => ({
      id: row.id,
      pageId: row.page_id,
      kind: row.kind,
      pos: row.pos,
      configJson: nullable(row.config_json),
      contentHtml: nullable(row.content_html),
    }))
  }

  private async loadActivities(pageId: number): Promise<PublishActivityRecord[]> {
    const { results } = await this.env.DB.prepare(
      `SELECT id, page_id, title, image_key, image_alt, description_html, pos
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
        pos: number
      }>()

    return (results ?? []).map((row) => ({
      id: row.id,
      pageId: row.page_id,
      title: row.title,
      imageKey: nullable(row.image_key),
      imageAlt: nullable(row.image_alt),
      descriptionHtml: nullable(row.description_html),
      pos: row.pos,
    }))
  }

  private async loadEvents(pageId: number): Promise<PublishEventRecord[]> {
    const { results } = await this.env.DB.prepare(
      `SELECT id, page_id, title, image_key, image_alt, start_date, end_date, description_html, pos
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
      pos: row.pos,
    }))
  }
}
