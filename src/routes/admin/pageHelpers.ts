import type { JSONContent } from '@tiptap/core'
import type { PreviewSectionRecord, PreviewSnapshot } from '../../repositories/previewRepo'
import type { ActivityItemView } from '../../templates/admin/components/activityItem'
import type { EventItemView } from '../../templates/admin/components/eventItem'

export const EMPTY_CONTENT: JSONContent = { type: 'doc', content: [] }

export function parseJsonContent(value: string | null | undefined): JSONContent {
  if (!value) return EMPTY_CONTENT
  try {
    const parsed = JSON.parse(value)
    if (parsed && typeof parsed === 'object') {
      return parsed as JSONContent
    }
    return EMPTY_CONTENT
  } catch {
    return EMPTY_CONTENT
  }
}

export function resolveActivitiesLayout(section: PreviewSectionRecord): 'grid' | 'carousel' {
  if (!section.configJson) return 'grid'
  try {
    const parsed = JSON.parse(section.configJson) as { activities_layout?: string }
    return parsed.activities_layout === 'carousel' ? 'carousel' : 'grid'
  } catch {
    return 'grid'
  }
}

export function resolveEventsHidePast(section: PreviewSectionRecord | null | undefined): boolean {
  if (!section?.configJson) return false
  try {
    const parsed = JSON.parse(section.configJson) as { events_hide_past?: boolean | string }
    const flag = parsed.events_hide_past
    if (typeof flag === 'string') {
      return flag.toLowerCase() === 'true'
    }
    return flag === true
  } catch {
    return false
  }
}

export function mapActivities(snapshot: PreviewSnapshot | null): ActivityItemView[] {
  if (!snapshot) return []
  return snapshot.activities
    .slice()
    .sort((a, b) => a.pos - b.pos || a.id - b.id)
    .map((activity) => ({
      id: activity.id,
      title: activity.title,
      imageKey: activity.imageKey ?? null,
      imageAlt: activity.imageAlt ?? null,
      pos: activity.pos,
      editor: {
        id: activityEditorId(activity.id),
        html: activity.descriptionHtml ?? '',
        json: parseJsonContent(activity.descriptionJson),
      },
    }))
}

export function mapEvents(snapshot: PreviewSnapshot | null): EventItemView[] {
  if (!snapshot) return []
  return snapshot.events
    .slice()
    .sort((a, b) => a.pos - b.pos || a.id - b.id)
    .map((event) => ({
      id: event.id,
      title: event.title,
      imageKey: event.imageKey ?? null,
      imageAlt: event.imageAlt ?? null,
      startDate: event.startDate ?? null,
      endDate: event.endDate ?? null,
      pos: event.pos,
      editor: {
        id: eventEditorId(event.id),
        html: event.descriptionHtml ?? '',
        json: parseJsonContent(event.descriptionJson),
      },
    }))
}

export function activityEditorId(id: number | null): string {
  return `activity_desc_${id ?? 'draft'}`
}

export function eventEditorId(id: number | null): string {
  return `event_desc_${id ?? 'draft'}`
}
