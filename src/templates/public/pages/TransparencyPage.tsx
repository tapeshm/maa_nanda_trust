/** @jsxImportSource hono/jsx */

import type { FC } from 'hono/jsx'
import PublicLayout from '../layout/PublicLayout'
import type { TransparencyPageContent } from '../../../data/transparency'
import { type Language, DEFAULT_LANGUAGE } from '../../../utils/i18n'
import { getNavLinks } from '../../../config/navigation'

const LABELS = {
  en: {
    trustDetails: "Trust Details",
    trustName: "Trust Name",
    regNo: "Registration Number",
    regDate: "Date of Registration",
    propDetails: "Property Details",
    documents: "Documents",
    download: "Download"
  },
  hi: {
    trustDetails: "न्यास विवरण",
    trustName: "न्यास का नाम",
    regNo: "पंजीकरण संख्या",
    regDate: "पंजीकरण दिनांक",
    propDetails: "संपत्ति विवरण",
    documents: "दस्तावेज़",
    download: "डाउनलोड"
  }
};

type TransparencyPageProps = {
  transparencyContent: TransparencyPageContent
  lang?: Language
  activePath?: string
}

const TransparencyPage: FC<TransparencyPageProps> = ({ 
  transparencyContent, 
  lang = DEFAULT_LANGUAGE,
  activePath = '/transparency'
}) => {
  const labels = LABELS[lang];
  const navLinks = getNavLinks(lang);

  return (
    <PublicLayout
      title="Transparency — Maa Nanda Kansuwa Trust"
      navLinks={navLinks}
      lang={lang}
      activePath={activePath}
    >
      <main class="py-12 md:py-20 px-4">
        <div class="max-w-5xl mx-auto space-y-8">
          
          {/* Hero */}
          <div class="text-center mb-12">
            <h1 class="text-3xl md:text-4xl font-serif font-light text-amber-100/90 mb-4 tracking-wider">{transparencyContent.hero.title}</h1>
            <p class="text-white/70 max-w-2xl mx-auto">{transparencyContent.hero.description}</p>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
            
            {/* Trust Details */}
            <div class="bg-white/5 border border-white/10 rounded-xl p-8 backdrop-blur-md">
              <h2 class="text-2xl font-serif text-amber-200 mb-6">{labels.trustDetails}</h2>
              <dl class="space-y-4 text-sm">
                <div>
                  <dt class="text-white/50 uppercase tracking-wider text-xs mb-1">{labels.trustName}</dt>
                  <dd class="text-white font-medium text-lg">{transparencyContent.trustDetails.trustName}</dd>
                </div>
                <div>
                  <dt class="text-white/50 uppercase tracking-wider text-xs mb-1">{labels.regNo}</dt>
                  <dd class="text-white font-mono">{transparencyContent.trustDetails.registrationNumber}</dd>
                </div>
                <div>
                  <dt class="text-white/50 uppercase tracking-wider text-xs mb-1">{labels.regDate}</dt>
                  <dd class="text-white">{transparencyContent.trustDetails.dateOfRegistration}</dd>
                </div>
              </dl>
            </div>

            {/* Property Details */}
            <div class="bg-white/5 border border-white/10 rounded-xl p-8 backdrop-blur-md">
              <h2 class="text-2xl font-serif text-amber-200 mb-6">{labels.propDetails}</h2>
              <ul class="space-y-3">
                {transparencyContent.propertyDetails.map((detail) => (
                  <li class="flex items-start gap-3 text-white/80 text-sm">
                    <span class="text-amber-400 mt-1">❖</span>
                    <span>{detail}</span>
                  </li>
                ))}
              </ul>
            </div>

          </div>

          {/* Documents */}
          <div class="bg-white/5 border border-white/10 rounded-xl p-8 backdrop-blur-md">
            <h2 class="text-2xl font-serif text-amber-200 mb-8">{labels.documents}</h2>
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {transparencyContent.documents.map((doc) => (
                <a 
                  href={doc.url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  class="group block bg-white/5 hover:bg-white/10 border border-white/5 hover:border-amber-400/30 rounded-lg p-5 transition-all duration-300"
                >
                  <div class="flex items-center justify-between mb-3">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-8 h-8 text-amber-400 group-hover:scale-110 transition-transform">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                    </svg>
                    <span class="text-xs text-amber-400/70 uppercase tracking-wider border border-amber-400/20 rounded px-2 py-0.5 group-hover:bg-amber-400/10">PDF</span>
                  </div>
                  <h3 class="text-lg font-medium text-white mb-2 group-hover:text-amber-100">{doc.name}</h3>
                  <p class="text-xs text-white/60 leading-relaxed mb-4">{doc.description}</p>
                  <span class="text-xs font-semibold text-amber-400 flex items-center gap-1">
                    {labels.download}
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-3 h-3">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                    </svg>
                  </span>
                </a>
              ))}
            </div>
          </div>

        </div>
      </main>
    </PublicLayout>
  )
}

export default TransparencyPage
