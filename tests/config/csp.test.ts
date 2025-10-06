import { describe, it, expect } from 'vitest'

import { buildCsp } from '../../src/config/csp'

describe('CSP configuration', () => {
  const makeContext = (env: Record<string, unknown> = {}) => ({
    env,
    req: { url: 'https://example.com/' },
    get: () => undefined,
  }) as any

  it('includes img-src self in development mode', () => {
    const csp = buildCsp(makeContext({ ENV: 'development' }))
    expect(csp).toContain("img-src 'self'")
    expect(csp).not.toMatch(/img-src [^;]*data:/)
  })

  it('includes img-src self in production mode', () => {
    const csp = buildCsp(makeContext({ ENV: 'production' }))
    expect(csp).toContain("img-src 'self'")
    expect(csp).not.toMatch(/img-src [^;]*data:/)
  })
})
