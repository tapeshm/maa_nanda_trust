import { Hono } from 'hono'
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'
import type { Bindings } from '../../bindings'
import { requireAuth, requireAdmin } from '../../middleware/auth'
import { ensureCsrf } from '../../middleware/csrf'
import { upsertDonateContent } from '../../data/donate.data'
import type { DonatePageContentRaw } from '../../data/donate'
import { invalidateCachedPublicHtml } from '../../utils/pages/cache'

const app = new Hono<{ Bindings: Bindings }>()

app.post(
  '/dashboard/donate/save',
  requireAuth(),
  requireAdmin,
  async (c, next) => {
    ensureCsrf(c)
    await next()
  },
  async (c) => {
    const formData = await c.req.parseBody({ all: true })
    
    const qrCodeUrl = (formData['qr_code_url'] as string) || ''
    
    const appealEn = (formData['content_html[appeal-editor-en]'] as string) || 
                   ((formData.content_html as Record<string, string>)?.[ 'appeal-editor-en']) || '';
                   
    const appealHi = (formData['content_html[appeal-editor-hi]'] as string) || 
                   ((formData.content_html as Record<string, string>)?.[ 'appeal-editor-hi']) || '';

    const content: DonatePageContentRaw = {
      qrCodeUrl,
      appeal: { en: appealEn, hi: appealHi },
    }

    try {
      await upsertDonateContent(c.env, content)
      await invalidateCachedPublicHtml(c.env, 'donate') // legacy
      await invalidateCachedPublicHtml(c.env, 'donate:en')
      await invalidateCachedPublicHtml(c.env, 'donate:hi')
      return c.redirect('/admin/dashboard/donate?success=true')
    } catch (e) {
      console.error('Failed to save donate content:', e)
      return c.redirect('/admin/dashboard/donate?error=save_failed')
    }
  },
)

export default app