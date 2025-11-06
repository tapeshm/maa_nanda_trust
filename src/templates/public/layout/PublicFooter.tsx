/** @jsxImportSource hono/jsx */

import type { FC } from 'hono/jsx'

export interface PublicFooterProps {
  text?: string
}

// [D3:pages.step-03:public-footer] Footer for public pages
const PublicFooter: FC<PublicFooterProps> = ({
  text = 'Crafted for iterative exploration — feedback guides the next darśan of design.',
}) => (
  <footer class="mt-16 pb-16 text-center text-sm uppercase tracking-widest opacity-70">
    {text}
  </footer>
)

export default PublicFooter
