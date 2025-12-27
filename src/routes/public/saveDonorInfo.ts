import { Hono } from 'hono'
import type { Bindings } from '../../bindings'
import { csrfProtect } from '../../middleware/csrf'
import { createDonationRecord } from '../../data/donationRecords.data'

const app = new Hono<{ Bindings: Bindings }>()

// English route
app.post(
  '/donate/submit',
  csrfProtect(),
  async (c) => {
    try {
      const formData = await c.req.parseBody()

      const name = (formData['name'] as string)?.trim() || undefined
      const mobile = (formData['mobile'] as string)?.trim() || undefined
      const pan_number = (formData['pan_number'] as string)?.trim().toUpperCase() || undefined
      const committed_amount_str = formData['committed_amount'] as string
      const committed_amount = committed_amount_str ? parseFloat(committed_amount_str) : undefined

      // Validate mobile format if provided
      if (mobile && !/^[0-9]{10}$/.test(mobile)) {
        return c.redirect('/donate?error=true')
      }

      // Validate PAN format if provided
      if (pan_number && !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(pan_number)) {
        return c.redirect('/donate?error=true')
      }

      // Validate amount if provided
      if (committed_amount !== undefined && (isNaN(committed_amount) || committed_amount <= 0)) {
        return c.redirect('/donate?error=true')
      }

      // Generate a unique ID
      const id = crypto.randomUUID()

      await createDonationRecord(c.env, id, {
        name,
        mobile,
        pan_number,
        committed_amount,
      })

      return c.redirect('/donate?success=true')
    } catch (e) {
      console.error('Failed to save donor info:', e)
      return c.redirect('/donate?error=true')
    }
  }
)

// Hindi route
app.post(
  '/hi/donate/submit',
  csrfProtect(),
  async (c) => {
    try {
      const formData = await c.req.parseBody()

      const name = (formData['name'] as string)?.trim() || undefined
      const mobile = (formData['mobile'] as string)?.trim() || undefined
      const pan_number = (formData['pan_number'] as string)?.trim().toUpperCase() || undefined
      const committed_amount_str = formData['committed_amount'] as string
      const committed_amount = committed_amount_str ? parseFloat(committed_amount_str) : undefined

      // Validate mobile format if provided
      if (mobile && !/^[0-9]{10}$/.test(mobile)) {
        return c.redirect('/hi/donate?error=true')
      }

      // Validate PAN format if provided
      if (pan_number && !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(pan_number)) {
        return c.redirect('/hi/donate?error=true')
      }

      // Validate amount if provided
      if (committed_amount !== undefined && (isNaN(committed_amount) || committed_amount <= 0)) {
        return c.redirect('/hi/donate?error=true')
      }

      // Generate a unique ID
      const id = crypto.randomUUID()

      await createDonationRecord(c.env, id, {
        name,
        mobile,
        pan_number,
        committed_amount,
      })

      return c.redirect('/hi/donate?success=true')
    } catch (e) {
      console.error('Failed to save donor info:', e)
      return c.redirect('/hi/donate?error=true')
    }
  }
)

export default app
