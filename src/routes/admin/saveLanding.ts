import { Hono } from 'hono'
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'
import type { Bindings } from '../../bindings'
import { requireAuth, requireAdmin } from '../../middleware/auth'
import { ensureCsrf } from '../../middleware/csrf'
import { upsertLandingContent } from '../../data/landing.data'
import type { LandingPageContent } from '../../data/landing'

const app = new Hono<{ Bindings: Bindings }>()

const landingSchema = z.object({
  hero_eyebrow: z.string(),
  hero_title: z.string(),
  hero_description: z.string(),
  welcome_title: z.string(),
  welcome_description: z.string(),
  projects_title: z.string(),
  projects_description: z.string(),
  events_title: z.string(),
  events_description: z.string(),
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

    const content: LandingPageContent = {
      hero: {
        eyebrow: data.hero_eyebrow,
        title: data.hero_title,
        description: data.hero_description,
      },
      welcome: {
        title: data.welcome_title,
        description: data.welcome_description,
      },
      projectsSection: {
        title: data.projects_title,
        description: data.projects_description,
      },
      eventsSection: {
        title: data.events_title,
        description: data.events_description,
      },
    }

    try {
      await upsertLandingContent(c.env, content)
      return c.redirect('/admin/dashboard/home?success=true')
    } catch (e) {
      console.error('Failed to save landing content:', e)
      return c.redirect('/admin/dashboard/home?error=save_failed')
    }
  },
)

export default app
