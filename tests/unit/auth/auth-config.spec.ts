import { describe, it, expect } from 'vitest'
import { supabaseAuth } from '../../../src/middleware/auth'

describe('auth middleware config', () => {
  it('creates a middleware function with minimal required options', () => {
    const mw = supabaseAuth({
      projectUrl: 'https://abc123.supabase.co',
      publishableKey: 'sb_publishable_123',
    })
    expect(typeof mw).toBe('function')
  })

  it('accepts optional token source and cookie options', () => {
    const mw = supabaseAuth({
      projectUrl: 'https://myproj.supabase.co',
      publishableKey: 'sb_publishable_key',
      tokenSources: {
        cookieSsrAuthName: 'sb-custom-auth-token',
      },
      cookieOptions: {
        name: 'ignored-by-middleware',
        path: '/',
        httpOnly: false,
        secure: false,
        sameSite: 'lax',
      },
      expected: {
        issuer: 'https://myproj.supabase.co/auth/v1',
        audience: 'authenticated',
      },
    })
    expect(typeof mw).toBe('function')
  })
})
