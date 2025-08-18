import type { FC } from 'hono/jsx'
import type { FinanceRecord } from '../utils/db'

/**
 * Render a list of finance records as a table.  When `editable` is true a
 * simple form is shown to add new entries.  The form posts to the parent
 * route and uses HTMX to update the table without a full page reload.  Both
 * credit and debit totals are computed for display.
 */
const FinancePage: FC<{ records: FinanceRecord[]; editable?: boolean }> = ({
  records,
  editable = false,
}) => {
  // Compute totals
  const totals = records.reduce(
    (acc, rec) => {
      if (rec.type === 'credit') acc.credit += rec.amount
      else acc.debit += rec.amount
      return acc
    },
    { credit: 0, debit: 0 },
  )

  return (
    <div>
      <h1 class="text-2xl font-semibold mb-4">Finance Records</h1>
      <table class="min-w-full divide-y divide-gray-200 border mb-4">
        <thead class="bg-gray-100">
          <tr>
            <th class="px-4 py-2 text-left text-sm font-medium text-gray-700">
              Activity
            </th>
            <th class="px-4 py-2 text-left text-sm font-medium text-gray-700">
              Date
            </th>
            <th class="px-4 py-2 text-left text-sm font-medium text-gray-700">
              Type
            </th>
            <th class="px-4 py-2 text-right text-sm font-medium text-gray-700">
              Amount
            </th>
            <th class="px-4 py-2 text-left text-sm font-medium text-gray-700">
              Contact
            </th>
            <th class="px-4 py-2 text-left text-sm font-medium text-gray-700">
              Notes
            </th>
          </tr>
        </thead>
        <tbody id="finance-table" class="divide-y divide-gray-100">
          {records.map((rec) => (
            <tr key={rec.id} class="bg-white">
              <td class="px-4 py-2 text-sm whitespace-nowrap">{rec.activity}</td>
              <td class="px-4 py-2 text-sm whitespace-nowrap">{rec.date}</td>
              <td class="px-4 py-2 text-sm whitespace-nowrap capitalize">
                {rec.type}
              </td>
              <td class="px-4 py-2 text-sm whitespace-nowrap text-right">
                {rec.amount.toFixed(2)}
              </td>
              <td class="px-4 py-2 text-sm whitespace-nowrap">
                {rec.contact || '-'}
              </td>
              <td class="px-4 py-2 text-sm whitespace-nowrap">
                {rec.notes || '-'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div class="flex justify-between mb-4">
        <div>
          <p class="text-sm font-medium">Total Credit: {totals.credit.toFixed(2)}</p>
          <p class="text-sm font-medium">Total Debit: {totals.debit.toFixed(2)}</p>
        </div>
      </div>
      {editable && (
        <div>
          <h2 class="text-xl font-semibold mb-2">Add Record</h2>
          {/* The form posts back to the same route.  We rely on HTMX to target
              the finance table and swap its HTML. */}
          <form
            hx-post="/finance"
            hx-target="#finance-table"
            hx-swap="outerHTML"
            class="space-y-4"
          >
            <div class="flex flex-col md:flex-row md:space-x-4">
              <div class="flex-1">
                <label class="block text-sm font-medium mb-1">Activity</label>
                <input
                  type="text"
                  name="activity"
                  required
                  class="w-full border rounded px-2 py-1"
                />
              </div>
              <div class="flex-1">
                <label class="block text-sm font-medium mb-1">Date</label>
                <input
                  type="date"
                  name="date"
                  required
                  class="w-full border rounded px-2 py-1"
                />
              </div>
            </div>
            <div class="flex flex-col md:flex-row md:space-x-4">
              <div class="flex-1">
                <label class="block text-sm font-medium mb-1">Type</label>
                <select
                  name="type"
                  required
                  class="w-full border rounded px-2 py-1"
                >
                  <option value="credit">Credit</option>
                  <option value="debit">Debit</option>
                </select>
              </div>
              <div class="flex-1">
                <label class="block text-sm font-medium mb-1">Amount</label>
                <input
                  type="number"
                  step="0.01"
                  name="amount"
                  required
                  class="w-full border rounded px-2 py-1"
                />
              </div>
            </div>
            <div class="flex flex-col md:flex-row md:space-x-4">
              <div class="flex-1">
                <label class="block text-sm font-medium mb-1">Contact</label>
                <input
                  type="text"
                  name="contact"
                  class="w-full border rounded px-2 py-1"
                />
              </div>
              <div class="flex-1">
                <label class="block text-sm font-medium mb-1">Notes</label>
                <input
                  type="text"
                  name="notes"
                  class="w-full border rounded px-2 py-1"
                />
              </div>
            </div>
            <div>
              <button
                type="submit"
                class="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
              >
                Add Record
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}

export default FinancePage