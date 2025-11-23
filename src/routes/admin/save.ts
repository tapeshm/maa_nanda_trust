import { Hono } from 'hono'
import type { Context } from 'hono'
import type { Bindings } from '../../bindings'
import { requireAuth, requireAdmin } from '../../middleware/auth'
import { assertPageSlug, type PageSlug } from '../../config/pages'
import { getCsrfParsedBody } from '../../middleware/csrf'
import { PreviewRepo } from '../../repositories/previewRepo'
import { parsePageForm } from '../../utils/forms/pageForm'

// [D3:pages.step-03:admin-save-router] Handles saving preview drafts into the unified pages table.
const saveRoutes = new Hono<{ Bindings: Bindings }>()

saveRoutes.post('/:slug/save', requireAuth(), requireAdmin, async (c) => {
  const slug = assertPageSlug(c.req.param('slug'))
  const repo = new PreviewRepo(c.env)
  const rawBody =
    (getCsrfParsedBody<Record<string, unknown>>(c) ??
      (await c.req.parseBody())) as Record<string, unknown> | undefined
  const htmx = isHtmxRequest(c)

  try {
    const pageInput = parsePageForm(slug, rawBody)
    const snapshot = await repo.saveDraft(pageInput)
    if (htmx) {
      return c.json({
        ok: true,
        pageId: snapshot.page.id,
        slug: snapshot.page.slug,
        version: snapshot.page.version,
      })
    }
    const redirectTarget = (rawBody?._redirect as string) || undefined
    return redirectToEditor(c, slug, {
      saved: '1',
      pageId: String(snapshot.page.id),
      version: String(snapshot.page.version),
    }, redirectTarget)
  } catch (error: any) {
    const message = typeof error?.message === 'string' ? error.message : 'Invalid payload'
    if (htmx) {
      return c.json({ ok: false, error: message }, 400)
    }
    const redirectTarget = (rawBody?._redirect as string) || undefined
    return redirectToEditor(c, slug, {
      error: '1',
      message,
    }, redirectTarget)
  }
})

export default saveRoutes

function isHtmxRequest(c: Context<{ Bindings: Bindings }>): boolean {
  const header = c.req.header('HX-Request') ?? c.req.header('Hx-Request')
  return (header ?? '').toLowerCase() === 'true'
}

function redirectToEditor(
  c: Context<{ Bindings: Bindings }>,
  slug: PageSlug,
  params: Record<string, string | undefined>,
  customTarget?: string
) {
  const target = new URL(customTarget ?? `/admin/${slug}`, c.req.url)
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined) continue
    target.searchParams.set(key, value)
  }
  const location = `${target.pathname}${target.search}`
  return c.redirect(location, 303)
}
