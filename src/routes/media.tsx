import { Hono } from 'hono'

import type { Bindings } from '../bindings'
import { listMedia, insertMedia } from '../utils/db'
import { adminAuth } from '../middleware/auth'
import MediaAdminPage from '../templates/mediaAdmin'

const app = new Hono<{ Bindings: Bindings }>()

// Serve individual media objects from R2.  This route is mounted at
// `/media` so the key becomes the path parameter.  We set the response
// headers based on the stored HTTP metadata.  If the object is not
// found we return 404.
app.get('/:key', async (c) => {
  const key = c.req.param('key')
  const obj = await c.env.R2.get(key)
  if (!obj) {
    return c.text('Media not found', 404)
  }
  const headers: Record<string, string> = {}
  const meta = obj.httpMetadata || {}
  if (meta.contentType) headers['content-type'] = meta.contentType
  if (meta.contentLanguage) headers['content-language'] = meta.contentLanguage
  if (meta.cacheControl) headers['cache-control'] = meta.cacheControl
  // Fall back to a default content type
  if (!headers['content-type']) headers['content-type'] = 'application/octet-stream'
  return new Response(obj.body, { headers })
})

// Admin view of media library.  Shows a list of uploaded files and an
// upload form.  Requires basic auth.  When mounted at `/media` on the
// router this becomes `/media/admin`.
app.get('/admin', adminAuth, async (c) => {
  const records = await listMedia(c.env)
  return c.html(<MediaAdminPage records={records} />)
})

// Upload a new media file to R2.  Expects a multipart/form-data
// submission with a single field named `file`.  Generates a random
// UUID as the object key, uploads the file to R2 with HTTP metadata
// including the original filename and MIME type, and stores a record in
// the database.  After uploading we redirect back to the admin page.
app.post('/upload', adminAuth, async (c) => {
  const body = await c.req.parseBody()
  const file = body['file'] as unknown
  if (!file || !(file instanceof File)) {
    return c.text('File upload missing', 400)
  }
  const key = crypto.randomUUID()
  // Upload to R2 using the file stream.  The httpMetadata property
  // ensures that Cloudflare will return the correct headers when the
  // object is served【839556421027750†L288-L314】.
  await c.env.R2.put(key, file.stream(), {
    httpMetadata: {
      contentType: file.type,
      contentDisposition: `inline; filename="${file.name}"`,
    },
  })
  // Record metadata in the database.  The `url` can be null since
  // objects are served via this Worker route.
  await insertMedia(c.env, {
    key,
    filename: file.name,
    mimetype: file.type,
    size: file.size,
    url: null,
  })
  // Redirect back to the admin page to show the updated list.  Use a
  // 303 redirect so the browser performs a GET request.
  return c.redirect('/media/admin', 303)
})

export default app