/** @jsxImportSource hono/jsx */

import type { FC } from 'hono/jsx'
import PublicLayout from '../layout/PublicLayout'
import EventCard from '../components/EventCard'
import type { Event } from '../../../data/events.data'
import { type Language, DEFAULT_LANGUAGE } from '../../../utils/i18n'
import { getNavLinks } from '../../../config/navigation'

const LABELS = {
  en: {
    title: "Trust Events",
    description: "Upcoming and past events organized by the trust."
  },
  hi: {
    title: "न्यास कार्यक्रम",
    description: "न्यास द्वारा आयोजित आगामी और पिछले कार्यक्रम।"
  }
};

type EventsPageProps = {
  events: Event[]
  lang?: Language
  activePath?: string
}

const EventsPage: FC<EventsPageProps> = ({ 
  events,
  lang = DEFAULT_LANGUAGE,
  activePath = '/events'
}) => {
  const labels = LABELS[lang];
  const navLinks = getNavLinks(lang);

  return (
    <PublicLayout
      title="Events — Maa Nanda Kansuwa Trust"
      navLinks={navLinks}
      lang={lang}
      activePath={activePath}
    >
      <main class="py-12 md:py-20 px-4">
        <div class="max-w-6xl mx-auto p-8 md:p-12 rounded-xl glass-panel">

          <section id="events">
            <h1 class="text-3xl md:text-4xl font-serif font-light text-amber-100/90 mb-4 tracking-wider text-center">{labels.title}</h1>
            <p class="text-center text-white/70 mb-10 md:mb-12">{labels.description}</p>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
              {events.map((event) => (
                <a href={lang === 'hi' ? `/hi/events/${event.id}` : `/events/${event.id}`} class="block transition-transform hover:scale-105 h-full">
                  <EventCard event={event} />
                </a>
              ))}
            </div>
          </section>

        </div>
      </main>
    </PublicLayout>
  )
}

export default EventsPage