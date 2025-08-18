import type { FC } from 'hono/jsx'

/**
 * Dashboard overview for administrators.  Shows counts of pages, media
 * items and finance totals with links to their respective management
 * sections.  The finance totals object contains credit and debit sums.
 */
const Dashboard: FC<{
  contentCount: number
  mediaCount: number
  totals: { credit: number; debit: number }
}> = ({ contentCount, mediaCount, totals }) => {
  return (
    <div>
      <h1 class="text-2xl font-semibold mb-6">Admin Dashboard</h1>
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div class="bg-white p-4 rounded shadow">
          <h2 class="text-lg font-medium mb-2">Pages</h2>
          <p class="text-3xl font-bold mb-2">{contentCount}</p>
          <a href="/admin/content" class="text-blue-600 hover:underline text-sm">
            Manage Pages
          </a>
        </div>
        <div class="bg-white p-4 rounded shadow">
          <h2 class="text-lg font-medium mb-2">Media Files</h2>
          <p class="text-3xl font-bold mb-2">{mediaCount}</p>
          <a href="/media/admin" class="text-blue-600 hover:underline text-sm">
            Manage Media
          </a>
        </div>
        <div class="bg-white p-4 rounded shadow">
          <h2 class="text-lg font-medium mb-2">Finance</h2>
          <p class="text-sm mb-1">Credit: {totals.credit.toFixed(2)}</p>
          <p class="text-sm mb-2">Debit: {totals.debit.toFixed(2)}</p>
          <a href="/finance/admin" class="text-blue-600 hover:underline text-sm">
            Manage Finance
          </a>
        </div>
      </div>
    </div>
  )
}

export default Dashboard