/** @jsxImportSource hono/jsx */

import { describe, it, expect } from 'vitest'
import { renderToString } from 'hono/jsx/dom/server'
import LandingPage from '../../src/templates/public/pages/landing'
import { DEFAULT_LANDING_CONTENT } from '../../src/data/landing.data'

describe('LandingPage', () => {
  it('renders dynamic content from landingContent prop', () => {
    const markup = renderToString(<LandingPage projects={[]} events={[]} landingContent={DEFAULT_LANDING_CONTENT} />)

    // Assertions for hero section
    expect(markup).toContain(DEFAULT_LANDING_CONTENT.hero.title)
    expect(markup).toContain(DEFAULT_LANDING_CONTENT.hero.eyebrow)
    expect(markup).toContain(DEFAULT_LANDING_CONTENT.hero.description)

    // Assertions for welcome section
    expect(markup).toContain(DEFAULT_LANDING_CONTENT.welcome.title)
    expect(markup).toContain(DEFAULT_LANDING_CONTENT.welcome.description)

    // Assertions for projects section header
    expect(markup).toContain(DEFAULT_LANDING_CONTENT.projectsSection.title)
    expect(markup).toContain(DEFAULT_LANDING_CONTENT.projectsSection.description)

    // Assertions for events section header
    expect(markup).toContain(DEFAULT_LANDING_CONTENT.eventsSection.title)
    expect(markup).toContain(DEFAULT_LANDING_CONTENT.eventsSection.description)
  })
})
