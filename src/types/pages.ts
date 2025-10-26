import type { PageSlug, PageSectionKind } from '../config/pages'

export interface TemplatePageRecord {
  id: number
  slug: PageSlug
  version: number
  title: string
  heroImageKey: string | null
  donateEnabled: boolean
}

export interface TemplateSectionRecord {
  id: number
  kind: PageSectionKind
  pos: number
  configJson?: string | null
  contentHtml?: string | null
}

export interface TemplateActivityRecord {
  id: number
  title: string
  pos: number
  imageKey?: string | null
  imageAlt?: string | null
  descriptionHtml?: string | null
}

export interface TemplateEventRecord {
  id: number
  title: string
  pos: number
  imageKey?: string | null
  imageAlt?: string | null
  startDate?: string | null
  endDate?: string | null
  descriptionHtml?: string | null
}

export interface TemplateSnapshot {
  page: TemplatePageRecord
  sections: TemplateSectionRecord[]
  activities: TemplateActivityRecord[]
  events: TemplateEventRecord[]
}
