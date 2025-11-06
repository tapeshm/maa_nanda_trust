/** @jsxImportSource hono/jsx */

import type { FC } from 'hono/jsx'
import PublicLayout from '../layout/PublicLayout'
import type { PublicNavLink } from '../layout/PublicTopNav'
import Hero from '../blocks/Hero'
import ScrollManuscript from '../blocks/ScrollManuscript'
import DonationCta from '../blocks/DonationCta'

const NAV_LINKS: PublicNavLink[] = [
  { href: '#darshan', label: 'Darśan' },
  { href: '#seva', label: 'Sevā' },
  { href: '#festivals', label: 'Festivals' },
  { href: '#community', label: 'Community' },
  { href: '/donate', label: 'Donate', highlighted: true },
]

// [D3:pages.step-03:landing-page] Landing page using clean components from reference
const LandingPage: FC = () => (
  <PublicLayout
    title="Maa Nanda Kansuwa Trust"
    navLinks={NAV_LINKS}
    includeTempleDoor
  >
    <Hero
      eyebrow="Maa Nanda Kansuwa Trust"
      title="Enter the Divine Resonance"
      description="Guided by centuries of Himalayan devotion, the temple opens its doors to every seeker with warmth, wisdom, and seva."
    />

    <ScrollManuscript
      id="seva"
      introEyebrow="Our Invocation"
      introHeading="In Service of Maa Nanda Devi"
      introBody="Within the Garhwal Himalayas, Maa Nanda Devi is revered as the guardian deity of the mountains and the hearts of its people. The Kansuwa Trust preserves the living heritage of rituals, music, and community service that has flourished for generations. Each darśan celebrates the timeless sanctity of the shrine while opening new pathways for seva and sustainability."
      sections={[
        {
          id: 'festivals',
          eyebrow: 'Seasonal Rhythm',
          heading: 'Festivals that Illuminate',
          body: '',
          cards: [
            {
              title: 'Shardiya Navaratri',
              body: "Nine sacred evenings of bhajan, aarti, and community langar celebrate the goddess's victory of light and compassion.",
            },
            {
              title: 'Jan Bhawani Mela',
              body: 'A convergence of folk art, local artisans, and heritage storytellers that keep the oral traditions alive.',
            },
            {
              title: 'Deepdaan Mahotsav',
              body: 'Thousands of diyas float upon the Alakananda river, each prayer supporting education and healthcare initiatives for hill communities.',
            },
          ],
        },
        {
          id: 'community',
          eyebrow: 'Seva Today',
          heading: 'Community Pathways',
          body: 'Beyond rituals, the Trust anchors education drives, women-led self-help groups, and eco-sensitive pilgrim trails. Together we nurture reverence for Maa Nanda while strengthening the hands that uphold her sanctum. Your presence sustains the heritage, and your support expands its circle of care.',
        },
      ]}
    />

    <DonationCta
      heading="Offerings that Sustain Sacred Service"
      body="Each contribution nurtures daily worship, community kitchens, and restorative projects that keep the Himalayas' sacred pulse alive."
    />
  </PublicLayout>
)

export default LandingPage
