import { describe, it, expect, beforeEach, vi } from 'vitest'
import { exchangeLogin, refreshAccess, SupabaseAuthError } from '../../src/auth/supabaseTokens'

const env = {
  SUPABASE_URL: 'https://example.supabase.co',
  SUPABASE_ANON_KEY: 'anon',
}

describe('supabaseTokens', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('successful login returns tokens', async () => {
    vi.spyOn(globalThis, 'fetch' as any).mockResolvedValue(
      new Response(
        JSON.stringify({ access_token: 'a1', refresh_token: 'r1' }),
        { status: 200 },
      ),
    )
    const pair = await exchangeLogin(env, { email: 'e', password: 'p' })
    expect(pair.access_token).toBe('a1')
    expect(pair.refresh_token).toBe('r1')
  })

  it('successful refresh rotates tokens', async () => {
    vi.spyOn(globalThis, 'fetch' as any).mockResolvedValue(
      new Response(
        JSON.stringify({ access_token: 'a2', refresh_token: 'r2' }),
        { status: 200 },
      ),
    )
    const pair = await refreshAccess(env, 'r1')
    expect(pair.access_token).toBe('a2')
    expect(pair.refresh_token).toBe('r2')
  })

  it('maps invalid_grant already-used', async () => {
    vi.spyOn(globalThis, 'fetch' as any).mockResolvedValue(
      new Response(
        JSON.stringify({ error: 'invalid_grant', error_description: 'Refresh Token has been used' }),
        { status: 400 },
      ),
    )
    await expect(refreshAccess(env, 'r1')).rejects.toMatchObject({
      name: 'SupabaseAuthError',
      status: 400,
      category: 'invalid_grant_already_used',
      retryable: false,
    } satisfies Partial<SupabaseAuthError>)
  })

  it('maps invalid/revoked family', async () => {
    vi.spyOn(globalThis, 'fetch' as any).mockResolvedValue(
      new Response(
        JSON.stringify({ error: 'invalid_grant', error_description: 'Token family was revoked' }),
        { status: 400 },
      ),
    )
    await expect(refreshAccess(env, 'r1')).rejects.toMatchObject({
      status: 400,
      category: 'invalid_or_revoked_family',
      retryable: false,
    } satisfies Partial<SupabaseAuthError>)
  })

  it('propagates 5xx as retryable', async () => {
    vi.spyOn(globalThis, 'fetch' as any).mockResolvedValue(
      new Response('oops', { status: 502 }),
    )
    await expect(refreshAccess(env, 'r1')).rejects.toMatchObject({
      status: 502,
      retryable: true,
    } satisfies Partial<SupabaseAuthError>)
  })
})

