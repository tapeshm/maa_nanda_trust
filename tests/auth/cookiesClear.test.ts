import { describe, it, expect } from 'vitest'
import { Hono } from 'hono'
import { clearAllAuthCookies } from '../../src/auth/cookies'
import { getSetCookies } from '../utils/http'


describe('clearAllAuthCookies', () => {
  it('clears both cookies correctly', async () => {
    const app = new Hono()
    app.get('/clear', (c) => {
      clearAllAuthCookies(c)
      return c.text('ok')
    })

    const res = await app.request('http://x/clear')
    const cookies = getSetCookies(res)
    const joined = cookies.join('\n')
    expect(joined).toContain('__Host-access_token=')
    expect(joined).toContain('__Host-refresh_token=')
    expect(joined).toContain('Max-Age=0')
    expect(joined).toContain('Path=/')
    expect(joined).toContain('HttpOnly')
    expect(joined).toContain('Secure')
    expect(joined).toContain('SameSite=Lax')
  })
})
