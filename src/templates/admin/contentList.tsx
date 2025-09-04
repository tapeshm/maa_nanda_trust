import type { FC } from 'hono/jsx'
import type { ContentRecord } from '../../utils/db'

/**
 * List all content blocks for administrative management.  Provides a link
 * to create a new page and a table listing existing pages with edit
 * actions.
 */
const ContentListPage: FC<{ pages: ContentRecord[] }> = ({ pages }) => {
  return (
    <div>
      <h1 class="text-2xl font-semibold mb-4">Manage Pages</h1>
      <div class="mb-4">
        <a
          href="/admin/content/new"
          class="inline-block bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          Add New Page
        </a>
      </div>
      <table class="min-w-full divide-y divide-gray-200 border">
        <thead class="bg-gray-100">
          <tr>
            <th class="px-4 py-2 text-left text-sm font-medium text-gray-700">
              Slug
            </th>
            <th class="px-4 py-2 text-left text-sm font-medium text-gray-700">
              Title
            </th>
            <th class="px-4 py-2 text-left text-sm font-medium text-gray-700">
              Updated At
            </th>
            <th class="px-4 py-2 text-left text-sm font-medium text-gray-700">
              Actions
            </th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-100">
          {pages.map((p) => (
            <tr key={p.id} class="bg-white">
              <td class="px-4 py-2 text-sm whitespace-nowrap">{p.slug}</td>
              <td class="px-4 py-2 text-sm whitespace-nowrap">{p.title}</td>
              <td class="px-4 py-2 text-sm whitespace-nowrap">
                {new Date(p.updated_at).toLocaleDateString()}
              </td>
              <td class="px-4 py-2 text-sm whitespace-nowrap">
                <div class="flex items-center gap-3">
                  <a href={`/admin/content/${p.slug}`} class="text-blue-600 hover:underline">Edit</a>
                  <form method="post" action={`/admin/content/${p.slug}/delete`} onSubmit="return confirm('Delete this page?');">
                    <button type="submit" class="text-red-600 hover:underline">Delete</button>
                  </form>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default ContentListPage
