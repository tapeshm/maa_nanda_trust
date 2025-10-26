import { PAGE_SECTION_KINDS, type PageSectionKind, type PageSlug } from '../../config/pages'
import type {
  PreviewActivityInput,
  PreviewEventInput,
  PreviewPageInput,
  PreviewSectionInput,
} from '../../repositories/previewRepo'

type ParsedBody = Record<string, unknown> | undefined

type EditorValueMaps = {
  html: Record<string, string>
  json: Record<string, string>
}

const SECTION_KEY = /^sections\[(\d+)\]\[(\w+)\]$/
const ACTIVITY_KEY = /^activities\[(\d+)\]\[(\w+)\]$/
const EVENT_KEY = /^events\[(\d+)\]\[(\w+)\]$/

const SECTION_FIELDS = [
  'kind',
  'pos',
  'config_json',
  'content_html',
  'content_json',
  'content_id',
] as const
type SectionFieldName = (typeof SECTION_FIELDS)[number]
const SECTION_FIELD_SET: ReadonlySet<SectionFieldName> = new Set<SectionFieldName>(SECTION_FIELDS)

const ACTIVITY_FIELDS = [
  'title',
  'pos',
  'image_key',
  'image_alt',
  'description_html',
  'description_json',
  'description_id',
] as const
type ActivityFieldName = (typeof ACTIVITY_FIELDS)[number]
const ACTIVITY_FIELD_SET: ReadonlySet<ActivityFieldName> = new Set<ActivityFieldName>(ACTIVITY_FIELDS)

const EVENT_FIELDS = [
  'title',
  'pos',
  'image_key',
  'image_alt',
  'start_date',
  'end_date',
  'description_html',
  'description_json',
  'description_id',
] as const
type EventFieldName = (typeof EVENT_FIELDS)[number]
const EVENT_FIELD_SET: ReadonlySet<EventFieldName> = new Set<EventFieldName>(EVENT_FIELDS)

export function parsePageForm(slug: PageSlug, body: ParsedBody): PreviewPageInput {
  if (!body || typeof body !== 'object') {
    throw new Error('Missing form body')
  }

  const entries = filterStringEntries(body)
  const title = entries['title']?.trim()
  if (!title) {
    throw new Error('Title is required')
  }

  const heroImageKey = emptyToNull(entries['hero_image_key'])
  const donateEnabled = parseBoolean(entries['donate_enabled'])

  const editors = extractEditorMaps(entries)
  const sections = parseSections(entries, editors)
  const activities = parseActivities(entries, editors)
  const events = parseEvents(entries, editors)

  if (slug === 'activities') {
    const layout = resolveActivitiesLayout(entries['activities_layout'])
    if (layout) {
      for (const section of sections) {
        if (section.kind === 'activities') {
          section.configJson = JSON.stringify({ activities_layout: layout })
        }
      }
    }
  }

  if (slug === 'events') {
    const hidePast = parseBoolean(entries['events_hide_past'])
    for (const section of sections) {
      if (section.kind === 'events') {
        section.configJson = JSON.stringify({ events_hide_past: hidePast })
      }
    }
  }

  return {
    slug,
    title,
    heroImageKey,
    donateEnabled,
    sections,
    activities,
    events,
  }
}

function filterStringEntries(body: Record<string, unknown>): Record<string, string> {
  const out: Record<string, string> = {}
  for (const [key, value] of Object.entries(body)) {
    if (typeof value === 'string') {
      out[key] = value
    }
  }
  return out
}

function extractEditorMaps(entries: Record<string, string>): EditorValueMaps {
  const html: Record<string, string> = {}
  const json: Record<string, string> = {}
  for (const [key, value] of Object.entries(entries)) {
    const htmlMatch = /^content_html\[(.+)]$/.exec(key)
    if (htmlMatch) {
      html[htmlMatch[1]] = value
      continue
    }
    const jsonMatch = /^content_json\[(.+)]$/.exec(key)
    if (jsonMatch) {
      json[jsonMatch[1]] = value
    }
  }
  return { html, json }
}

function parseSections(entries: Record<string, string>, editors: EditorValueMaps): PreviewSectionInput[] {
  const bucket = collectIndexedFields(entries, SECTION_KEY, SECTION_FIELD_SET)
  return Array.from(bucket.entries())
    .sort(([left], [right]) => left - right)
    .map(([index, fields]) => buildSection(index, fields, editors))
    .filter((section): section is PreviewSectionInput => section !== null)
}

function buildSection(
  index: number,
  fields: Partial<Record<SectionFieldName, string>>,
  editors: EditorValueMaps,
): PreviewSectionInput | null {
  const kindRaw = fields['kind']
  if (!kindRaw) return null
  const kind = parseSectionKind(kindRaw)
  if (!kind) return null

  const pos = parseInteger(fields['pos'], index)
  const configJson = emptyToNull(fields['config_json'])
  const contentId = fields['content_id']
  let contentHtml = emptyToNull(fields['content_html'])
  let contentJson = emptyToNull(fields['content_json'])

  if (contentId) {
    if (contentHtml === null && editors.html[contentId] !== undefined) {
      contentHtml = emptyToNull(editors.html[contentId])
    }
    if (contentJson === null && editors.json[contentId] !== undefined) {
      contentJson = emptyToNull(editors.json[contentId])
    }
  }

  return {
    kind,
    pos,
    configJson,
    contentHtml,
    contentJson,
  }
}

function parseActivities(entries: Record<string, string>, editors: EditorValueMaps): PreviewActivityInput[] {
  const bucket = collectIndexedFields(entries, ACTIVITY_KEY, ACTIVITY_FIELD_SET)
  return Array.from(bucket.entries())
    .sort(([left], [right]) => left - right)
    .map(([, fields]) => buildActivity(fields, editors))
    .filter((activity): activity is PreviewActivityInput => activity !== null)
}

function buildActivity(
  fields: Partial<Record<ActivityFieldName, string>>,
  editors: EditorValueMaps,
): PreviewActivityInput | null {
  const title = fields['title']?.trim()
  if (!title) return null
  const pos = parseInteger(fields['pos'], 0)
  const contentId = fields['description_id']
  let descriptionHtml = emptyToNull(fields['description_html'])
  let descriptionJson = emptyToNull(fields['description_json'])
  if (contentId) {
    if (descriptionHtml === null && editors.html[contentId] !== undefined) {
      descriptionHtml = emptyToNull(editors.html[contentId])
    }
    if (descriptionJson === null && editors.json[contentId] !== undefined) {
      descriptionJson = emptyToNull(editors.json[contentId])
    }
  }
  return {
    title,
    pos,
    imageKey: emptyToNull(fields['image_key']),
    imageAlt: emptyToNull(fields['image_alt']),
    descriptionHtml,
    descriptionJson,
  }
}

function parseEvents(entries: Record<string, string>, editors: EditorValueMaps): PreviewEventInput[] {
  const bucket = collectIndexedFields(entries, EVENT_KEY, EVENT_FIELD_SET)
  return Array.from(bucket.entries())
    .sort(([left], [right]) => left - right)
    .map(([, fields]) => buildEvent(fields, editors))
    .filter((event): event is PreviewEventInput => event !== null)
}

function buildEvent(
  fields: Partial<Record<EventFieldName, string>>,
  editors: EditorValueMaps,
): PreviewEventInput | null {
  const title = fields['title']?.trim()
  if (!title) {
    return null
  }
  const pos = parseInteger(fields['pos'], 0)
  const contentId = fields['description_id']
  let descriptionHtml = emptyToNull(fields['description_html'])
  let descriptionJson = emptyToNull(fields['description_json'])
  if (contentId) {
    if (descriptionHtml === null && editors.html[contentId] !== undefined) {
      descriptionHtml = emptyToNull(editors.html[contentId])
    }
    if (descriptionJson === null && editors.json[contentId] !== undefined) {
      descriptionJson = emptyToNull(editors.json[contentId])
    }
  }

  return {
    title,
    pos,
    imageKey: emptyToNull(fields['image_key']),
    imageAlt: emptyToNull(fields['image_alt']),
    startDate: emptyToNull(fields['start_date']),
    endDate: emptyToNull(fields['end_date']),
    descriptionHtml,
    descriptionJson,
  }
}

function collectIndexedFields<TField extends string>(
  entries: Record<string, string>,
  pattern: RegExp,
  allowed: ReadonlySet<TField>,
): Map<number, Partial<Record<TField, string>>> {
  const bucket = new Map<number, Partial<Record<TField, string>>>()
  for (const [key, value] of Object.entries(entries)) {
    const match = pattern.exec(key)
    if (!match) continue
    const index = Number(match[1])
    const field = match[2] as TField
    if (!Number.isInteger(index) || !allowed.has(field)) continue
    const record = bucket.get(index) ?? ({} as Partial<Record<TField, string>>)
    record[field] = value
    bucket.set(index, record)
  }
  return bucket
}

function parseSectionKind(value: string): PageSectionKind | null {
  if (PAGE_SECTION_KINDS.includes(value as PageSectionKind)) {
    return value as PageSectionKind
  }
  return null
}

function parseInteger(value: string | undefined, fallback: number): number {
  if (value === undefined) return fallback
  const parsed = Number.parseInt(value, 10)
  if (Number.isNaN(parsed)) return fallback
  return parsed
}

function parseBoolean(value: string | undefined): boolean {
  if (!value) return false
  const normalized = value.toLowerCase()
  return normalized === '1' || normalized === 'true' || normalized === 'on' || normalized === 'yes'
}

function emptyToNull(value: string | undefined | null): string | null {
  if (value === undefined || value === null) return null
  const trimmed = value.trim()
  return trimmed.length === 0 ? null : trimmed
}
function resolveActivitiesLayout(value: string | undefined): 'grid' | 'carousel' | null {
  if (!value) return null
  return value === 'carousel' ? 'carousel' : 'grid'
}
