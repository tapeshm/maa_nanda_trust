import type { FC } from 'hono/jsx'
import PublicLayout from '../layout/PublicLayout'
import Hero from '../blocks/Hero'
import EventsEnvelopeCard from '../blocks/EventsEnvelopeCard'
import ProjectCard from '../components/ProjectCard'
import type { Project } from '../../../data/projects'
import type { Event } from '../../../data/events.data'
import type { LandingPageContent } from '../../../data/landing'
import { type Language, DEFAULT_LANGUAGE } from '../../../utils/i18n'
import { getNavLinks } from '../../../config/navigation'

// --- Landing Page ---

type LandingPageProps = {
  projects: Project[]
  events: Event[]
  landingContent: LandingPageContent
  lang?: Language
  activePath?: string
}

const LandingPage: FC<LandingPageProps> = ({ 
  projects, 
  events, 
  landingContent, 
  lang = DEFAULT_LANGUAGE,
  activePath = '/'
}) => {
  const heroTitle = landingContent.hero.title
  const navLinks = getNavLinks(lang);

  return (
  <PublicLayout
    title="Maa Nanda Kansuwa Trust"
    navLinks={navLinks}
    includeTempleDoor
    lang={lang}
    activePath={activePath}
  >
    <Hero
      eyebrow={landingContent.hero.eyebrow}
      title={heroTitle}
      description={landingContent.hero.description}
    />

    <main class="py-12 md:py-20 px-4">
      <div class="max-w-6xl mx-auto p-8 md:p-12 rounded-xl glass-panel">

        {/* --- Introduction / Welcome --- */}
        <section class="text-center mb-16 md:mb-24">
          <>
            <h2 class="text-3xl md:text-4xl font-serif font-light text-amber-100/90 mb-4 tracking-wider">{landingContent.welcome.title}</h2>
            <div class="max-w-3xl mx-auto">
              <p class="text-base md:text-lg text-white/80 leading-relaxed">
                {landingContent.welcome.description}
              </p>
            </div>
          </>
        </section>

        {/* --- Projects Section --- */}
        <section id="projects" class="mb-16 md:mb-24">
          <h2 class="text-3xl font-serif text-center mb-2 text-amber-200/90">{landingContent.projectsSection.title}</h2>
          <p class="text-center text-white/70 mb-10 md:mb-12">{landingContent.projectsSection.description}</p>
          <div class="flex flex-wrap justify-center gap-8 md:gap-10">
            {projects.map((project) => (
              <ProjectCard project={project} />
            ))}
          </div>
        </section>

        {/* --- Events Section --- */}
        <section id="events">
          <h2 class="text-3xl font-serif text-center mb-2 text-amber-200/90">{landingContent.eventsSection.title}</h2>
          <p class="text-center text-white/70 mb-10 md:mb-12">{landingContent.eventsSection.description}</p>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 max-w-4xl mx-auto">
            {events.filter(e => e.status === 'Upcoming').slice(0, 2).map((event) => (
              <EventsEnvelopeCard 
                title={event.title}
                date={event.displayDate || event.startDate}
                location={event.location}
                description={event.description}
                linkHref={`/events/${event.id}`}
                linkLabel="View Details"
              />
            ))}
          </div>
        </section>

      </div>
    </main>

  </PublicLayout>
)}

export default LandingPage