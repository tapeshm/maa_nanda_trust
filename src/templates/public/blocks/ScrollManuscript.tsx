/** @jsxImportSource hono/jsx */

import type { FC } from 'hono/jsx'

export interface ScrollCard {
  title: string
  body: string
}

export interface ScrollSection {
  id?: string
  eyebrow?: string
  heading: string
  body: string
  cards?: ScrollCard[]
}

export interface ScrollManuscriptProps {
  id?: string
  introEyebrow?: string
  introHeading: string
  introBody: string
  sections?: ScrollSection[]
}

// [D3:pages.step-03:scroll-manuscript] Manuscript scroll with brass rods and cords from reference
const ScrollManuscript: FC<ScrollManuscriptProps> = ({
  id = 'seva',
  introEyebrow = 'Our Invocation',
  introHeading,
  introBody,
  sections = [],
}) => (
  <section class="scroll-wrapper" id={id}>
    <div class="scroll-cords" aria-hidden="true">
      <span></span>
      <span></span>
    </div>
    <article class="scroll-bg prose prose-amber prose-lg max-w-none">
      <div class="scroll-section">
        {introEyebrow ? <p class="scroll-eyebrow">{introEyebrow}</p> : null}
        <h2 class="scroll-heading">{introHeading}</h2>
        <p class="scroll-text ">{introBody}</p>
      </div>

      {sections.map((section) => (
        <div key={section.id || section.heading} class="scroll-section" id={section.id}>
          {section.eyebrow ? <p class="scroll-eyebrow">{section.eyebrow}</p> : null}
          <h2 class="scroll-heading">{section.heading}</h2>
          {section.body ? <p class="scroll-text">{section.body}</p> : null}
          {section.cards && section.cards.length > 0 ? (
            <div class="scroll-grid">
              {section.cards.map((card) => (
                < div key={card.title} class="scroll-card prose prose-amber" >
                  <h3>{card.title}</h3>
                  <p>{card.body}</p>
                </div>

              ))}
            </div>
          ) : null}
        </div>
      ))}
    </article>
  </section >
)

export default ScrollManuscript
