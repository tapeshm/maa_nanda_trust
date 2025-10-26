// @vitest-environment miniflare

import { describe, it, expect } from 'vitest'
import { env } from 'cloudflare:test'

describe('image grid utility classes presence', () => {
  it('content.css/build contains .editor-figure-grid-2 and .editor-figure-grid-3', async () => {
    const response = await env.STATIC_ASSETS.fetch(new Request('https://example.com/assets/app.css'))
    const css = await response.text()
    expect(css).toMatch(/\.editor-figure-grid-2\b/)
    expect(css).toMatch(/\.editor-figure-grid-3\b/)
  })
})

