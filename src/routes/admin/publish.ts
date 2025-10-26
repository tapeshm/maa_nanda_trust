import { Hono } from 'hono'
import type { Bindings } from '../../bindings'
import { assertPageSlug } from '../../config/pages'
import { requireAuth, requireAdmin } from '../../middleware/auth'
import { PreviewRepo } from '../../repositories/previewRepo'
import { PublishRepo } from '../../repositories/publishRepo'
import { putCachedHtml } from '../../utils/pages/cache'
import { renderPublishedHtml } from '../../utils/pages/render'

// [D3:pages.step-03:admin-publish-router] Promotes preview snapshots to published status and caches HTML.
const publishRoutes = new Hono<{ Bindings: Bindings }>()

publishRoutes.post('/:slug/publish', requireAuth(), requireAdmin, async (c) => {
  const slug = assertPageSlug(c.req.param('slug'))
  const previewRepo = new PreviewRepo(c.env)
  const publishRepo = new PublishRepo(c.env)

  const snapshot = await previewRepo.getLatest(slug)
  if (!snapshot) {
    return c.json({ ok: false, error: 'No preview available for publish' }, 400)
  }

  const published = await publishRepo.publishFromPreview(snapshot)
  const html = await renderPublishedHtml(slug, published, { signedIn: false })
  await putCachedHtml(c.env, slug, published.page.id, published.page.version, html)
  return c.json({
    ok: true,
    pageId: published.page.id,
    slug: published.page.slug,
    version: published.page.version,
  })
})

export default publishRoutes
