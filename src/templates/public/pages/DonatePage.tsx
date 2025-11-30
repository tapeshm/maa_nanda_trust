/** @jsxImportSource hono/jsx */

import type { FC } from 'hono/jsx'
import PublicLayout from '../layout/PublicLayout'
import { resolveMediaUrl } from '../../../utils/pages/media'
import type { DonatePageContent } from '../../../data/donate'
import RichText from '../../components/RichText'
import { type Language, DEFAULT_LANGUAGE } from '../../../utils/i18n'
import { getNavLinks } from '../../../config/navigation'

const LABELS = {
  en: {
    upiTitle: "Donate via UPI",
    scanText: "Scan the QR code with any UPI app (GPay, PhonePe, Paytm, BHIM) to contribute.",
    supportTitle: "Support the Trust"
  },
  hi: {
    upiTitle: "UPI के माध्यम से दान करें",
    scanText: "योगदान करने के लिए किसी भी UPI ऐप (GPay, PhonePe, Paytm, BHIM) से QR कोड स्कैन करें।",
    supportTitle: "न्यास का समर्थन करें"
  }
};

type DonatePageProps = {
  donateContent: DonatePageContent
  lang?: Language
  activePath?: string
}

const DonatePage: FC<DonatePageProps> = ({ 
  donateContent, 
  lang = DEFAULT_LANGUAGE,
  activePath = '/donate'
}) => {
  const labels = LABELS[lang];
  const navLinks = getNavLinks(lang);
  const qrCodeUrl = donateContent.qrCodeUrl ? resolveMediaUrl(donateContent.qrCodeUrl) : '';

  return (
    <PublicLayout
      title="Donate — Maa Nanda Kansuwa Trust"
      navLinks={navLinks}
      lang={lang}
      activePath={activePath}
    >
      <main class="py-12 md:py-20 px-4">
        <div class="max-w-4xl mx-auto p-8 md:p-12 rounded-xl glass-panel">
          
          <div class="text-center mb-12">
            <h1 class="text-3xl md:text-4xl font-serif font-light text-amber-100/90 mb-6 tracking-wider">{labels.supportTitle}</h1>
            <div class="max-w-2xl mx-auto">
               <RichText html={donateContent.appeal} className="text-base md:text-lg text-white/80 leading-relaxed" />
            </div>
          </div>

          {qrCodeUrl ? (
            <div class="flex flex-col items-center justify-center p-8 bg-white/5 border border-white/10 rounded-2xl max-w-sm mx-auto backdrop-blur-md shadow-2xl">
              <h2 class="text-xl font-serif text-amber-200 mb-6">{labels.upiTitle}</h2>
              <div class="bg-white p-4 rounded-xl shadow-inner mb-6">
                <img src={qrCodeUrl} alt="Donate QR Code" class="w-48 h-48 object-contain" />
              </div>
              <p class="text-sm text-white/60 text-center max-w-xs">
                {labels.scanText}
              </p>
            </div>
          ) : (
             <div class="text-center p-12 bg-white/5 rounded-lg border border-dashed border-white/20">
                <p class="text-white/50 italic">Donation details coming soon.</p>
             </div>
          )}

        </div>
      </main>
    </PublicLayout>
  )
}

export default DonatePage