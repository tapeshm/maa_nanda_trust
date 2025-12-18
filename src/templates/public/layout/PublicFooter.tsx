/** @jsxImportSource hono/jsx */

import type { FC } from 'hono/jsx'

export interface PublicFooterProps {
  text?: string
}

// [D3:pages.step-03:public-footer] Footer for public pages with contact info
const PublicFooter: FC<PublicFooterProps> = ({
  text = 'Crafted for iterative exploration — feedback guides the next darśan of design.',
}) => (
  <footer class="mt-16 pb-16 px-4">
    <div class="max-w-4xl mx-auto text-center space-y-6">
      {/* Contact */}
      <div class="text-sm text-white/60 space-y-1">
        <p>Maa Nanda Kansuwa Trust</p>
        <p>Kansuwa Village, Karnaprayag, Uttarakhand</p>
      </div>

      {/* Divider */}
      <div class="text-amber-500/40 text-xs tracking-[0.5em]">॥ ॥ ॥</div>

      {/* Tagline */}
      <p class="text-xs uppercase tracking-widest opacity-50">{text}</p>

      {/* Built with Shraddha */}
      <p class="text-xs text-amber-500/40 italic">Built with श्रद्धा</p>
    </div>
  </footer>
)

export default PublicFooter
