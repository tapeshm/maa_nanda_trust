/** @jsxImportSource hono/jsx */

import type { FC } from 'hono/jsx'

export interface FloatingDonationButtonProps {
  href?: string
  label?: string
  icon?: string
}

// [D3:pages.step-03:floating-donation] Persistent floating donation CTA
const FloatingDonationButton: FC<FloatingDonationButtonProps> = ({
  href = '/donate',
  label = 'Donate',
  icon = '🪔',
}) => (
  <a
    href={href}
    class="fixed bottom-6 left-6 z-[100] inline-flex items-center gap-2 bg-gradient-to-br from-amber-200 to-amber-600 text-amber-900 font-bold uppercase tracking-widest px-6 py-3 rounded-full shadow-[0_8px_24px_rgba(0,0,0,0.35)] backdrop-blur-sm border border-amber-300/40 hover:shadow-[0_12px_32px_rgba(0,0,0,0.45)] hover:-translate-y-1 transition-all duration-300 text-sm"
  >
    <span aria-hidden="true">{icon}</span>
    <span>{label}</span>
  </a>
)

export default FloatingDonationButton
