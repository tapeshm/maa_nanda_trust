import { Hono } from 'hono'
import type { Bindings } from '../../bindings'
import { requireAuth, requireAdmin } from '../../middleware/auth'
import { csrfProtect } from '../../middleware/csrf'
import {
  updateDonationRecord,
  deleteDonationRecord,
  getAllDonationRecords,
  bulkInsertDonationRecords,
  replaceAllDonationRecords
} from '../../data/donationRecords.data'
import { recordsToCSV, parseCSV } from '../../utils/csv'

const app = new Hono<{ Bindings: Bindings }>()

// Save/Update a donation record
app.post(
  '/dashboard/donation-records/save',
  requireAuth(),
  requireAdmin,
  csrfProtect(),
  async (c) => {
    try {
      const formData = await c.req.parseBody()

      const id = formData['id'] as string
      if (!id) {
        return c.redirect('/admin/dashboard/donation-records?error=Invalid record ID')
      }

      const name = (formData['name'] as string)?.trim() || null
      const mobile = (formData['mobile'] as string)?.trim() || null
      const pan_number = (formData['pan_number'] as string)?.trim().toUpperCase() || null
      const committed_amount_str = formData['committed_amount'] as string
      const donated_amount_str = formData['donated_amount'] as string

      const committed_amount = committed_amount_str ? parseFloat(committed_amount_str) : null
      const donated_amount = donated_amount_str ? parseFloat(donated_amount_str) : null

      // Validate mobile format if provided
      if (mobile && !/^[0-9]{10}$/.test(mobile)) {
        return c.redirect(`/admin/dashboard/donation-records/edit/${id}?error=Invalid mobile number format`)
      }

      // Validate PAN format if provided
      if (pan_number && !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(pan_number)) {
        return c.redirect(`/admin/dashboard/donation-records/edit/${id}?error=Invalid PAN number format`)
      }

      await updateDonationRecord(c.env, id, {
        name,
        mobile,
        pan_number,
        committed_amount,
        donated_amount
      })

      return c.redirect('/admin/dashboard/donation-records?success=Record updated successfully')
    } catch (e) {
      console.error('Failed to save donation record:', e)
      return c.redirect('/admin/dashboard/donation-records?error=Failed to save record')
    }
  }
)

// Delete a donation record
app.post(
  '/dashboard/donation-records/delete',
  requireAuth(),
  requireAdmin,
  csrfProtect(),
  async (c) => {
    try {
      const formData = await c.req.parseBody()
      const id = formData['id'] as string

      if (!id) {
        return c.redirect('/admin/dashboard/donation-records?error=Invalid record ID')
      }

      await deleteDonationRecord(c.env, id)

      return c.redirect('/admin/dashboard/donation-records?success=Record deleted successfully')
    } catch (e) {
      console.error('Failed to delete donation record:', e)
      return c.redirect('/admin/dashboard/donation-records?error=Failed to delete record')
    }
  }
)

// Export donation records as CSV
app.get(
  '/dashboard/donation-records/export',
  requireAuth(),
  requireAdmin,
  async (c) => {
    try {
      const records = await getAllDonationRecords(c.env)

      const columns = [
        'id',
        'name',
        'mobile',
        'pan_number',
        'committed_amount',
        'donated_amount',
        'created_at',
        'updated_at'
      ] as const

      const csv = recordsToCSV(records, columns)

      const date = new Date().toISOString().split('T')[0]
      const filename = `donation_records_${date}.csv`

      return new Response(csv, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="${filename}"`,
          'Cache-Control': 'no-cache'
        }
      })
    } catch (e) {
      console.error('Failed to export donation records:', e)
      return c.redirect('/admin/dashboard/donation-records?error=Failed to export records')
    }
  }
)

// Import donation records from CSV
app.post(
  '/dashboard/donation-records/import',
  requireAuth(),
  requireAdmin,
  csrfProtect(),
  async (c) => {
    try {
      const formData = await c.req.parseBody()
      const file = formData['file']
      const mode = formData['mode'] as string || 'append'

      if (!file || typeof file === 'string') {
        return c.redirect('/admin/dashboard/donation-records?error=No file uploaded')
      }

      const csvContent = await file.text()

      if (!csvContent.trim()) {
        return c.redirect('/admin/dashboard/donation-records?error=CSV file is empty')
      }

      const columns = ['name', 'mobile', 'pan_number', 'committed_amount', 'donated_amount'] as const
      const parsedRecords = parseCSV(csvContent, columns)

      if (parsedRecords.length === 0) {
        return c.redirect('/admin/dashboard/donation-records?error=No valid records found in CSV')
      }

      // Add UUIDs to records
      const recordsWithIds = parsedRecords.map(record => ({
        id: crypto.randomUUID(),
        name: record.name || undefined,
        mobile: record.mobile || undefined,
        pan_number: record.pan_number?.toUpperCase() || undefined,
        committed_amount: record.committed_amount ? parseFloat(record.committed_amount) : undefined,
        donated_amount: record.donated_amount ? parseFloat(record.donated_amount) : undefined
      }))

      let count: number

      if (mode === 'replace') {
        count = await replaceAllDonationRecords(c.env, recordsWithIds)
      } else {
        count = await bulkInsertDonationRecords(c.env, recordsWithIds)
      }

      return c.redirect(`/admin/dashboard/donation-records?success=Imported ${count} records successfully`)
    } catch (e) {
      console.error('Failed to import donation records:', e)
      return c.redirect('/admin/dashboard/donation-records?error=Failed to import records')
    }
  }
)

export default app
