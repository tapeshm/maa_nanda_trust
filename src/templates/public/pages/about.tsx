/** @jsxImportSource hono/jsx */

import type { FC } from 'hono/jsx'
import PublicLayout from '../layout/PublicLayout'
import type { AboutPageContent, Trustee } from '../../../data/about'
import RichText from '../../components/RichText'
import { resolveMediaUrl } from '../../../utils/pages/media'
import { type Language, DEFAULT_LANGUAGE } from '../../../utils/i18n'
import { getNavLinks } from '../../../config/navigation'

// --- Data ---

const LABELS = {
  en: {
    values: "Our Values",
    trustees: "Our Trustees",
    transparencyLink: "Explore our Transparency Reports"
  },
  hi: {
    values: "हमारे मूल्य",
    trustees: "हमारे न्यासी",
    transparencyLink: "हमारी पारदर्शिता रिपोर्ट देखें"
  }
};

// --- Components ---

const portraitPlaceholder = (name: string) => `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="320" height="320" viewBox="0 0 320 320"><rect width="320" height="320" fill="%231a1a1a"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="white" font-size="120" font-family="serif">${name.charAt(0)}</text></svg>`

const FocusAreaCard: FC<{ title: string, description: string }> = ({ title, description }) => (
    <div class="bg-white/5 border border-white/10 rounded-lg p-6 h-full text-center">
        <h3 class="text-xl font-serif font-semibold mb-3 text-amber-200">{title}</h3>
        <p class="text-base text-white/80 leading-relaxed">{description}</p>
    </div>
)

const TrusteeCard: FC<{ trustee: Trustee }> = ({ trustee }) => {
  const imageSrc = trustee.imageUrl ? resolveMediaUrl(trustee.imageUrl) : portraitPlaceholder(trustee.name)
  return (
    <div class="project-card bg-white/5 border border-white/10 rounded-lg overflow-hidden shadow-lg text-center">
      <div class="w-full h-48 bg-white/10 flex items-center justify-center">
        <img src={imageSrc} alt={`Portrait of ${trustee.name}`} class="w-full h-full object-cover" />
      </div>
      <div class="p-4">
        <h3 class="text-lg font-serif font-semibold text-amber-200">{trustee.name}</h3>
        <p class="text-sm text-amber-400/80 mb-2">{trustee.role}</p>
        <p class="text-white/70 text-xs leading-relaxed">{trustee.bio}</p>
      </div>
    </div>
  )
}

// --- About Page ---

type AboutPageProps = {
  aboutContent: AboutPageContent
  lang?: Language
  activePath?: string
}

const AboutPage: FC<AboutPageProps> = ({ 
  aboutContent, 
  lang = DEFAULT_LANGUAGE,
  activePath = '/about'
}) => {
  const labels = LABELS[lang];
  const navLinks = getNavLinks(lang);

  return (
  <PublicLayout
    title="About — Maa Nanda Kansuwa Trust"
    navLinks={navLinks}
    lang={lang}
    activePath={activePath}
  >
    <main class="py-12 md:py-20 px-4">
      <div class="max-w-6xl mx-auto p-8 md:p-12 rounded-xl glass-panel">

        {/* --- Header / Hero --- */}
        <section class="text-center mb-16">
          <h1 class="text-3xl md:text-4xl font-serif font-light text-amber-100/90 mb-4 tracking-wider">{aboutContent.hero.title}</h1>
          <div class="max-w-3xl mx-auto">
            <p class="text-base md:text-lg text-white/80 leading-relaxed">
              {aboutContent.hero.description}
            </p>
          </div>
        </section>

        {/* --- Mission Section --- */}
        <section class="mb-16 md:mb-20">
            <h2 class="text-3xl font-serif text-center mb-8 text-amber-200/90">{aboutContent.mission.title}</h2>
            <div class="max-w-3xl mx-auto text-center">
                 <RichText html={aboutContent.mission.description} className="text-base md:text-lg text-white/80 leading-relaxed" />
            </div>
        </section>

         {/* --- Vision Section --- */}
        <section class="mb-16 md:mb-20">
            <h2 class="text-3xl font-serif text-center mb-8 text-amber-200/90">{aboutContent.vision.title}</h2>
             <div class="max-w-3xl mx-auto">
                <p class="text-base md:text-lg text-white/80 leading-relaxed text-center">
                  {aboutContent.vision.description}
                </p>
              </div>
        </section>

        {/* --- Values Section --- */}
        <section id="focus-areas" class="mb-16 md:mb-20">
            <h2 class="text-3xl font-serif text-center mb-10 text-amber-200/90">{labels.values}</h2>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
                {aboutContent.values.map((value) => (
                    <FocusAreaCard title={value.title} description={value.description} />
                ))}
            </div>
        </section>

        {/* --- Trustees Section --- */}
        <section id="trustees" class="mb-16 md:mb-20">
           <h2 class="text-3xl font-serif text-center mb-10 text-amber-200/90">{labels.trustees}</h2>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
            {aboutContent.trustees.map((trustee) => (
              <TrusteeCard trustee={trustee} />
            ))}
          </div>
        </section>

        {/* --- Story Section --- */}
        <section class="mb-16">
           <h2 class="text-3xl font-serif text-center mb-10 text-amber-200/90">{aboutContent.story.title}</h2>
           <div class="max-w-3xl mx-auto">
               <RichText html={aboutContent.story.description} className="text-base md:text-lg text-white/80 leading-relaxed" />
           </div>
        </section>

        {/* --- Transparency Link --- */}
         <div class="text-center mt-16">
            <a href={lang === 'hi' ? '/hi/transparency' : '/transparency'} class="text-amber-400 hover:text-amber-200 font-semibold border border-amber-400/50 rounded-full px-6 py-2 transition-colors hover:bg-amber-400/10">
                {labels.transparencyLink}
            </a>
        </div>

      </div>
    </main>
  </PublicLayout>
)}

export default AboutPage