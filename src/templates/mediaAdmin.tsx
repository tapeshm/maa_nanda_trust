import type { FC } from 'hono/jsx'
import type { MediaRecord } from '../utils/db'

/**
 * Render the media library for administrators.  Includes a file upload
 * form and a responsive gallery of thumbnails.  Uploads are handled via
 * standard form submission; we do not use HTMX here because the
 * redirection is simple.
 */
const MediaAdminPage: FC<{ records: MediaRecord[] }> = ({ records }) => {
  return (
    <div>
      <h1 class="text-2xl font-semibold mb-4">Media Library</h1>
      <form
        action="/media/upload"
        method="post"
        encType="multipart/form-data"
        class="mb-6 flex flex-col sm:flex-row items-start sm:items-end space-y-2 sm:space-y-0 sm:space-x-4"
      >
        <div>
          <label class="block text-sm font-medium mb-1" for="file">
            Upload File
          </label>
          <input
            id="file"
            type="file"
            name="file"
            required
            class="block w-full text-sm text-gray-700 border border-gray-300 rounded px-2 py-1"
          />
        </div>
        <div>
          <button
            type="submit"
            class="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Upload
          </button>
        </div>
      </form>
      <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {records.map((m) => (
          <div
            key={m.id}
            class="border rounded overflow-hidden shadow bg-white"
          >
            <img
              src={`/media/${m.key}`}
              alt={m.filename}
              class="object-cover w-full h-32"
            />
            <div class="p-2">
              <p class="text-sm truncate" title={m.filename}>
                {m.filename}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default MediaAdminPage