/** @jsxImportSource hono/jsx */

import { describe, it, expect } from 'vitest'
import { renderToString } from 'hono/jsx/dom/server'
import AboutPage from '../../src/templates/public/pages/about'
import { DEFAULT_ABOUT_CONTENT } from '../../src/data/about'

describe('AboutPage', () => {
  it('renders with shared layout, dynamic content sections, and transparency CTA', () => {
    const markup = renderToString(<AboutPage aboutContent={DEFAULT_ABOUT_CONTENT} />)

    expect(markup).toContain('top-nav')
    expect(markup).toContain('href="/"')
    
    // Dynamic content checks
    expect(markup).toContain(DEFAULT_ABOUT_CONTENT.hero.title)
    expect(markup).toContain(DEFAULT_ABOUT_CONTENT.hero.description)
    expect(markup).toContain(DEFAULT_ABOUT_CONTENT.mission.title)
    expect(markup).toContain(DEFAULT_ABOUT_CONTENT.vision.title)
    expect(markup).toContain(DEFAULT_ABOUT_CONTENT.story.title)
    
    // Values check
    DEFAULT_ABOUT_CONTENT.values.forEach(value => {
        expect(markup).toContain(value.title)
    })

    // Trustees check
    DEFAULT_ABOUT_CONTENT.trustees.forEach(trustee => {
        expect(markup).toContain(trustee.name)
    })

    expect(markup).toContain('/transparency')
  })
})