import { Hono } from 'hono'
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'
import type { Bindings } from '../../bindings'
import { requireAuth, requireAdmin } from '../../middleware/auth'
import { ensureCsrf } from '../../middleware/csrf'
import { upsertLandingContent } from '../../data/landing.data'
import type { LandingPageContentRaw } from '../../data/landing'
import { invalidateCachedPublicHtml } from '../../utils/pages/cache'

const app = new Hono<{ Bindings: Bindings }>()

const landingSchema = z.object({
  hero_eyebrow_en: z.string().default(''),
  hero_eyebrow_hi: z.string().default(''),
  hero_title_en: z.string().default(''),
  hero_title_hi: z.string().default(''),
  hero_description_en: z.string().default(''),
  hero_description_hi: z.string().default(''),
  
  welcome_title_en: z.string().default(''),
  welcome_title_hi: z.string().default(''),
  welcome_description_en: z.string().default(''),
  welcome_description_hi: z.string().default(''),
  
  projects_title_en: z.string().default(''),
  projects_title_hi: z.string().default(''),
  projects_description_en: z.string().default(''),
  projects_description_hi: z.string().default(''),
  
  events_title_en: z.string().default(''),
  events_title_hi: z.string().default(''),
  events_description_en: z.string().default(''),
  events_description_hi: z.string().default(''),
})

app.post(
  '/dashboard/home/save',
  requireAuth(),
  requireAdmin,
  async (c, next) => {
    ensureCsrf(c)
    await next()
  },
  zValidator('form', landingSchema),
  async (c) => {
    const data = c.req.valid('form')

    const content: LandingPageContentRaw = {
      hero: {
        eyebrow: { en: data.hero_eyebrow_en, hi: data.hero_eyebrow_hi },
        title: { en: data.hero_title_en, hi: data.hero_title_hi },
        description: { en: data.hero_description_en, hi: data.hero_description_hi },
      },
      welcome: {
        title: { en: data.welcome_title_en, hi: data.welcome_title_hi },
        description: { en: data.welcome_description_en, hi: data.welcome_description_hi },
      },
      projectsSection: {
        title: { en: data.projects_title_en, hi: data.projects_title_hi },
        description: { en: data.projects_description_en, hi: data.projects_description_hi },
      },
      eventsSection: {
        title: { en: data.events_title_en, hi: data.events_title_hi },
        description: { en: data.events_description_en, hi: data.events_description_hi },
      },
    }

    try {
      await upsertLandingContent(c.env, content)
      await invalidateCachedPublicHtml(c.env, 'landing')
      // Invalidate both languages
      await invalidateCachedPublicHtml(c.env, 'landing:en')
      await invalidateCachedPublicHtml(c.env, 'landing:hi')
      return c.redirect('/admin/dashboard/home?success=true')
    } catch (e) {
      console.error('Failed to save landing content:', e)
      return c.redirect('/admin/dashboard/home?error=save_failed')
    }
  },
)

export default app