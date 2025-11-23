/** @jsxImportSource hono/jsx */

import type { FC } from 'hono/jsx'

export interface HeroProps {
  id?: string
  eyebrow?: string
  title: string
  subtitle?: string
  description?: string
  scrollHint?: string
  backgroundImage?: string
}

// [D3:pages.step-03:hero] Hero darshan section from reference
const Hero: FC<HeroProps> = ({
  id = 'darshan',
  eyebrow,
  title,
  subtitle,
  description,
  scrollHint = 'Scroll to Explore',
  backgroundImage,
}) => {
  const safeBg = backgroundImage ? backgroundImage.replace(/'/g, "\\'") : undefined
  const heroStyle = safeBg
    ? `background-image: linear-gradient(180deg, rgba(0,0,0,0.65), rgba(0,0,0,0.25)), url('${safeBg}'); background-size: cover; background-position: center;`
    : undefined

  return (
    <section class="hero" id={id} style={heroStyle}>
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
}

export default Hero
