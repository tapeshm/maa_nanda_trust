import { Hono } from 'hono'
import type { Bindings } from '../bindings'
import { clearAllAuthCookies } from '../auth/cookies'
import { ACCESS_COOKIE_NAME } from '../utils/constants'
import { getSupabaseUrl, getSupabaseAnonKey } from '../config/supabase'
import { getCookie } from 'hono/cookie'
import { isHtmx } from '../utils/request'

const router = new Hono<{ Bindings: Bindings }>()

async function globalSignOut(env: Record<string, unknown>, accessToken?: string): Promise<void> {
  try {
    const url = `${getSupabaseUrl(env)}/auth/v1/logout`
    const headers: HeadersInit = {
      apikey: getSupabaseAnonKey(env),
    }
    if (accessToken) headers['Authorization'] = `Bearer ${accessToken}`
    await fetch(url, { method: 'POST', headers })
  } catch {
    // best-effort; ignore errors
  }
}

async function handleLogout(c: any) {
  const htmx = isHtmx(c)
  const access = getCookie(c, ACCESS_COOKIE_NAME)
  await globalSignOut(c.env, access)
  clearAllAuthCookies(c)
  if (htmx) return c.json({ ok: true })
  return c.redirect('/', 302)
}

router.get('/logout', (c) => c.text('Method Not Allowed', 405))
router.post('/logout', handleLogout)

export default router
