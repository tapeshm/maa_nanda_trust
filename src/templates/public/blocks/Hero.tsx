/** @jsxImportSource hono/jsx */

import type { FC } from 'hono/jsx'

export interface HeroProps {
  id?: string
  eyebrow?: string
  title: string
  subtitle?: string
  description?: string
  scrollHint?: string
}

// [D3:pages.step-03:hero] Hero darshan section from reference
const Hero: FC<HeroProps> = ({
  id = 'darshan',
  eyebrow,
  title,
  subtitle,
  description,
  scrollHint = 'Scroll to Explore',
}) => (
  <section class="hero" id={id}>
    <div class="hero-content prose prose-invert prose-lg">
      {eyebrow ? <p class="hero-subtitle">{eyebrow}</p> : null}
      <h1 class="hero-title">{title}</h1>
      {subtitle || description ? (
        <p class="hero-subtitle">{subtitle || description}</p>
      ) : null}
    </div>
    <div class="scroll-indicator">
      <span>{scrollHint}</span>
      <span class="scroll-glyph" aria-hidden="true"></span>
    </div>
  </section>
)

export default Hero
