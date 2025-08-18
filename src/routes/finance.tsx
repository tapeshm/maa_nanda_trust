import { Hono } from 'hono'
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'

import type { Bindings } from '../bindings'
import FinancePage from '../templates/finance'
import { listFinance, insertFinance } from '../utils/db'
import { adminAuth } from '../middleware/auth'

/**
 * Schema for validating finance record submissions.  We accept form
 * encoded fields from HTMX.  The `amount` field is preprocessed to a
 * number and must be positive.  The `date` must follow the YYYY-MM-DD
 * pattern.  Contact and notes are optional.
 */
const financeSchema = z.object({
  activity: z.string().min(1, 'Activity is required'),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/u, 'Date must be YYYY-MM-DD'),
  type: z.enum(['credit', 'debit']),
  amount: z.preprocess(
    (val) => {
      if (typeof val === 'string' || typeof val === 'number') {
        const n = Number(val)
        return isNaN(n) ? undefined : n
      }
      return undefined
    },
    z.number().positive('Amount must be a number'),
  ),
  contact: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
})

const app = new Hono<{ Bindings: Bindings }>()

// Public listing of all finance records.  This route is mounted at
// `/finance` on the main router.  It renders a read‑only list using
// FinancePage with editable=false.
app.get('/', async (c) => {
  const records = await listFinance(c.env)
  return c.html(
    <FinancePage records={records} editable={false} />,
  )
})

// Admin view of finance records.  Requires basic auth.  The same
// FinancePage component is used but with editable=true so the form is
// displayed.  We wrap it in the admin layout in the parent router.
app.get('/admin', adminAuth, async (c) => {
  const records = await listFinance(c.env)
  return c.html(
    <FinancePage records={records} editable={true} />,
  )
})

// Insert a new finance record.  This handler expects a form‑encoded
// request containing the fields defined by financeSchema.  On success it
// returns only the updated table body so HTMX can swap the HTML without
// refreshing the entire page.  We protect this route with basic auth.
app.post('/', adminAuth, zValidator('form', financeSchema), async (c) => {
  const data = c.req.valid('form')
  // Insert new record
  await insertFinance(c.env, {
    activity: data.activity,
    date: data.date,
    type: data.type,
    amount: data.amount,
    contact: data.contact ?? null,
    notes: data.notes ?? null,
  })
  // Fetch updated list to render fresh rows
  const records = await listFinance(c.env)
  // Build the table body HTML.  We intentionally avoid using JSX here
  // because we need to return a fragment of HTML (tbody) for HTMX
  const rows = records
    .map((rec) => {
      return `
        <tr class="bg-white">
          <td class="px-4 py-2 text-sm whitespace-nowrap">${rec.activity}</td>
          <td class="px-4 py-2 text-sm whitespace-nowrap">${rec.date}</td>
          <td class="px-4 py-2 text-sm whitespace-nowrap capitalize">${rec.type}</td>
          <td class="px-4 py-2 text-sm whitespace-nowrap text-right">${rec.amount.toFixed(2)}</td>
          <td class="px-4 py-2 text-sm whitespace-nowrap">${rec.contact || '-'}</td>
          <td class="px-4 py-2 text-sm whitespace-nowrap">${rec.notes || '-'}</td>
        </tr>
      `
    })
    .join('')
  return c.html(`<tbody id="finance-table" class="divide-y divide-gray-100">${rows}</tbody>`, {
    headers: { 'hx-trigger': 'finance-updated' },
  })
})

export default app