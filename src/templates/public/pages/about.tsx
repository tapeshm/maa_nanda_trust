/** @jsxImportSource hono/jsx */

import type { FC } from 'hono/jsx'
import PublicLayout from '../layout/PublicLayout'
import type { PublicNavLink } from '../layout/PublicTopNav'
import ScrollManuscript from '../blocks/ScrollManuscript'

const NAV_LINKS: PublicNavLink[] = [
  { href: '#about-overview', label: 'About' },
  { href: '#about-community', label: 'Community' },
]

// [D3:pages.step-03:about-page] About page without door or donation
const AboutPage: FC = () => (
  <PublicLayout
    title="About — Maa Nanda Kansuwa Trust"
    navLinks={NAV_LINKS}
    includeTempleDoor={false}
  >
    <div class="pt-12">
      <ScrollManuscript
        id="about-overview"
        introEyebrow="Rooted in Reverence"
        introHeading="Guardians of Maa Nanda Devi's Sanctum"
        introBody="Maa Nanda Kansuwa Trust is a community-led effort to preserve the sanctity of the shrine, honour the folk traditions of Garhwal, and extend seva beyond the temple walls."
        sections={[
          {
            id: 'about-community',
            eyebrow: 'Seva in Practice',
            heading: 'Living Heritage and Service',
            body: 'From daily rituals and music to education programs and ecological stewardship, every initiative is guided by reverence for Maa Nanda Devi. We welcome pilgrims, volunteers, and partners who wish to strengthen this sacred lineage.',
          },
        ]}
      />
    </div>
  </PublicLayout>
)

export default AboutPage
