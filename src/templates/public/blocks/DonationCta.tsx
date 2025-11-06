/** @jsxImportSource hono/jsx */

import type { FC } from 'hono/jsx'

export interface DonationCtaProps {
  heading: string
  body: string
  donateHref?: string
  donateLabel?: string
  audioSrc?: string
}

// [D3:pages.step-03:donation-cta] Donation box with coin animation from reference
const DonationCta: FC<DonationCtaProps> = ({
  heading,
  body,
  donateHref = '/donate',
  donateLabel = 'Donate',
  audioSrc = '/assets/audio/coin-drop.mp3',
}) => (
  <section class="donation-section" aria-labelledby="donationHeading">
    <h2 class="hero-subtitle bg-black/20 px-6 py-2 rounded-lg backdrop-blur-sm" id="donationHeading">
      {heading}
    </h2>
    <div class="donation-box" role="presentation">
      <div class="donation-slot" aria-hidden="true"></div>
      <div class="coin" aria-hidden="true" id="donationCoin"></div>
      <a
        class="donation-button"
        href={donateHref}
        id="donationButton"
        data-donation-link
      >
        {donateLabel}
      </a>
    </div>
    <p class="donation-caption prose prose-invert prose-lg mx-auto max-w-md bg-black/20 px-6 py-3 rounded-lg backdrop-blur-sm">{body}</p>
    <audio id="coinSound" preload="auto">
      <source src={audioSrc} type="audio/mpeg" />
    </audio>
  </section>
)

export default DonationCta
