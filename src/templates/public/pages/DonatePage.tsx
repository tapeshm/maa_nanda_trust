/** @jsxImportSource hono/jsx */

import type { FC } from 'hono/jsx'
import PublicLayout from '../layout/PublicLayout'
import type { PublicNavLink } from '../layout/PublicTopNav'
import type { DonatePageContent } from '../../../data/donate'
import RichText from '../../components/RichText'
import { resolveMediaUrl } from '../../../utils/pages/media'

const NAV_LINKS: PublicNavLink[] = [
  { href: '/', label: 'Home' },
  { href: '/about', label: 'About Us' },
  { href: '/projects', label: 'Projects' },
  { href: '/events', label: 'Events' },
  { href: '/transparency', label: 'Transparency' },
]

type DonatePageProps = {
  donateContent: DonatePageContent
  isLoggedIn?: boolean
}

const DonatePage: FC<DonatePageProps> = ({ donateContent, isLoggedIn }) => (
  <PublicLayout
    title="Donate — Maa Nanda Kansuwa Trust"
    navLinks={NAV_LINKS}
    isLoggedIn={isLoggedIn}
  >
    <main class="py-12 md:py-20 px-4">
      <div class="max-w-4xl mx-auto p-8 md:p-12 rounded-xl" style="background: rgba(14, 8, 4, 0.75); backdrop-filter: blur(12px); border: 1px solid rgba(255, 255, 255, 0.1);">

        <section id="donate-main" class="text-center">
          <h1 class="text-3xl md:text-4xl font-serif font-light text-amber-100/90 mb-10 tracking-wider">Support Our Mission</h1>
          
          {donateContent.qrCodeUrl && (
            <div class="mb-12 flex justify-center">
              <div class="bg-white p-4 rounded-lg shadow-lg inline-block">
                <img 
                  src={resolveMediaUrl(donateContent.qrCodeUrl)} 
                  alt="Donation QR Code" 
                  class="w-64 h-64 md:w-80 md:h-80 object-contain"
                />
              </div>
            </div>
          )}

          <div class="max-w-2xl mx-auto">
             <RichText html={donateContent.appeal} className="text-base md:text-lg text-white/80 leading-relaxed space-y-4 content-prose" />
          </div>

        </section>

      </div>
    </main>
  </PublicLayout>
)

export default DonatePage
