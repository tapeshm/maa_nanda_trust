/** @jsxImportSource hono/jsx */

import type { FC } from 'hono/jsx'

export interface FloatingDonationButtonProps {
  href?: string
  label?: string
  icon?: string
}

// [D3:pages.step-03:floating-donation] Persistent floating donation CTA with diya animation
const FloatingDonationButton: FC<FloatingDonationButtonProps> = ({
  href = '/donate',
  label = 'Donate',
  icon = '🪔',
}) => (
  <a
    href={href}
    class="donation-fab"
  >
    <span class="donation-fab-flame" aria-hidden="true">{icon}</span>
    <span>{label}</span>
  </a>
)

export default FloatingDonationButton
