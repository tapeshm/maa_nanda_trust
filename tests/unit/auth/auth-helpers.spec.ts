import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { trimSlash, decodeB64, extractRolesFromClaims, isDebug } from '../../../src/middleware/auth'

describe('auth helpers', () => {
  describe('trimSlash', () => {
    it('removes a single trailing slash', () => {
      expect(trimSlash('https://example.com/')).toBe('https://example.com')
    })
    it('keeps url without trailing slash unchanged', () => {
      expect(trimSlash('https://example.com')).toBe('https://example.com')
    })
  })

  // pickBearer removed with SSR-cookie-only simplification

  describe('decodeB64', () => {
    it('decodes URL-safe base64 payloads', () => {
      const json = JSON.stringify({ a: 1, s: 'hi' })
      const urlSafe = Buffer.from(json).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
      expect(decodeB64(urlSafe)).toBe(json)
    })
  })

  describe('extractRolesFromClaims', () => {
    it('collects roles from app_metadata, lowercased', () => {
      const set = extractRolesFromClaims({
        // @ts-expect-error only properties we need
        app_metadata: { roles: ['Admin', 'TRUSTEE'], role: 'Manager' },
      } as any)
      const arr = Array.from(set)
      expect(arr).toEqual(expect.arrayContaining(['admin', 'trustee', 'manager']))
      expect(set.size).toBe(3)
    })
    it('returns empty set for null claims', () => {
      expect(extractRolesFromClaims(null).size).toBe(0)
    })
  })

  describe('isDebug', () => {
    const g = globalThis as any
    const original = { DEBUG_AUTH: g.DEBUG_AUTH }
    beforeEach(() => {
      delete g.DEBUG_AUTH
    })
    afterEach(() => {
      g.DEBUG_AUTH = original.DEBUG_AUTH
    })

    it('reads boolean-like env values on context', () => {
      // @ts-expect-error minimal shape
      expect(isDebug({ env: { DEBUG_AUTH: '1' } } as any)).toBe(true)
      // @ts-expect-error minimal shape
      expect(isDebug({ env: { DEBUG_AUTH: 'false' } } as any)).toBe(false)
      // @ts-expect-error minimal shape
      expect(isDebug({ env: { DEBUG_AUTH: true } } as any)).toBe(true)
    })

    it('falls back to global DEBUG_AUTH', () => {
      g.DEBUG_AUTH = 'yes'
      // @ts-expect-error minimal shape
      expect(isDebug({ env: {} } as any)).toBe(true)
      g.DEBUG_AUTH = false
      // @ts-expect-error minimal shape
      expect(isDebug({ env: {} } as any)).toBe(false)
    })
  })
})
