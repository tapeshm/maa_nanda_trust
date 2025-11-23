/** @jsxImportSource hono/jsx */

import type { FC } from 'hono/jsx'
import PublicLayout from '../layout/PublicLayout'
import type { PublicNavLink } from '../layout/PublicTopNav'
import type { TransparencyPageContent } from '../../../data/transparency'

const NAV_LINKS: PublicNavLink[] = [
  { href: '/', label: 'Home' },
  { href: '/about', label: 'About Us' },
  { href: '/projects', label: 'Projects' },
  { href: '/events', label: 'Events' },
  { href: '/transparency', label: 'Transparency' },
]

type TransparencyPageProps = {
  transparencyContent: TransparencyPageContent
}

const TransparencyPage: FC<TransparencyPageProps> = ({ transparencyContent }) => (
  <PublicLayout
    title="Transparency — Maa Nanda Kansuwa Trust"
    navLinks={NAV_LINKS}
  >
    <main class="py-12 md:py-20 px-4">
      <div class="max-w-4xl mx-auto p-8 md:p-12 rounded-xl glass-panel">

        <section id="transparency-main">
          <h1 class="text-3xl md:text-4xl font-serif font-light text-amber-100/90 mb-4 tracking-wider text-center">{transparencyContent.hero.title}</h1>
          <p class="text-center text-white/70 mb-10 md:mb-12">{transparencyContent.hero.description}</p>

          <div class="bg-black/20 p-6 rounded-lg mb-10">
            <dl class="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
              <div class="info-item">
                <dt class="text-sm text-amber-400/80">Trust Name</dt>
                <dd class="text-white/90 font-semibold">{transparencyContent.trustDetails.trustName}</dd>
              </div>
              <div class="info-item">
                <dt class="text-sm text-amber-400/80">Registration Number</dt>
                <dd class="text-white/90 font-semibold">{transparencyContent.trustDetails.registrationNumber}</dd>
              </div>
              <div class="info-item">
                <dt class="text-sm text-amber-400/80">Date of Registration</dt>
                <dd class="text-white/90 font-semibold">{transparencyContent.trustDetails.dateOfRegistration}</dd>
              </div>
              <div class="info-item md:col-span-2">
                <dt class="text-sm text-amber-400/80">Property Details</dt>
                <dd class="text-white/90 font-semibold">
                  <ul class="list-disc list-inside mt-1">
                    {transparencyContent.propertyDetails.map(detail => <li>{detail}</li>)}
                  </ul>
                </dd>
              </div>
            </dl>
          </div>

          <div>
            <h2 class="text-2xl font-serif text-center mb-6 text-amber-200/90">Documents & Downloads</h2>
            <div class="grid grid-cols-1 gap-4">
              {transparencyContent.documents.map(doc => (
                <a href={doc.url} target="_blank" rel="noopener noreferrer" class="bg-white/5 border border-white/10 rounded-lg p-4 flex justify-between items-center transition-colors hover:bg-white/10">
                  <div>
                    <p class="font-semibold text-amber-300">{doc.name}</p>
                    <p class="text-xs text-white/60">{doc.description}</p>
                  </div>
                  <div class="text-xs text-amber-400/80">Download &rarr;</div>
                </a>
              ))}
            </div>
          </div>

        </section>

      </div>
    </main>
  </PublicLayout>
)

export default TransparencyPage