import { describe, it, expect } from 'vitest'
import { resolveAuthIssuer } from '../src/index'

describe('resolveAuthIssuer', () => {
  it('returns Supabase issuer when running against hosted Supabase', () => {
    const issuer = resolveAuthIssuer({
      SUPABASE_URL: 'https://project.supabase.co',
      SUPABASE_JWT_SECRET: 'unused',
      DEV_SUPABASE_LOCAL: '0',
    })
    expect(issuer).toBe('https://project.supabase.co/auth/v1')
  })

  it('normalizes localhost issuer when DEV_SUPABASE_LOCAL=1', () => {
    const issuer = resolveAuthIssuer({
      SUPABASE_URL: 'http://localhost:54321',
      DEV_SUPABASE_LOCAL: '1',
    })
    expect(issuer).toBe('http://127.0.0.1:54321/auth/v1')
  })

  it('skips normalization when DEV_SUPABASE_LOCAL=1 but host is remote', () => {
    const issuer = resolveAuthIssuer({
      SUPABASE_URL: 'https://example.supabase.co',
      DEV_SUPABASE_LOCAL: '1',
    })
    expect(issuer).toBe('https://example.supabase.co/auth/v1')
  })

  it('returns undefined when SUPABASE_URL is missing or invalid', () => {
    expect(resolveAuthIssuer({})).toBeUndefined()
    expect(resolveAuthIssuer({ SUPABASE_URL: ':::::' })).toBeUndefined()
  })
})
