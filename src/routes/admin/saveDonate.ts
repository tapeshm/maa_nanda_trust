import { Hono } from 'hono'
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'
import type { Bindings } from '../../bindings'
import { requireAuth, requireAdmin } from '../../middleware/auth'
import { ensureCsrf } from '../../middleware/csrf'
import { upsertDonateContent } from '../../data/donate.data'
import type { DonatePageContent } from '../../data/donate'

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
    
    // Editor content extraction - checking flat keys first, then nested object
    const appeal = (formData['content_html[appeal-editor]'] as string) || 
                   ((formData.content_html as Record<string, string>)?.[ 'appeal-editor']) || 
                   '';

    const content: DonatePageContent = {
      qrCodeUrl,
      appeal,
    }

    try {
      await upsertDonateContent(c.env, content)
      return c.redirect('/admin/dashboard/donate?success=true')
    } catch (e) {
      console.error('Failed to save donate content:', e)
      return c.redirect('/admin/dashboard/donate?error=save_failed')
    }
  },
)

export default app
