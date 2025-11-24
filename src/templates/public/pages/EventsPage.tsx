/** @jsxImportSource hono/jsx */

import type { FC } from 'hono/jsx'
import PublicLayout from '../layout/PublicLayout'
import type { PublicNavLink } from '../layout/PublicTopNav'
import EventCard from '../components/EventCard'
import type { Event } from '../../../data/events.data'

const NAV_LINKS: PublicNavLink[] = [
  { href: '/', label: 'Home' },
  { href: '/about', label: 'About Us' },
  { href: '/projects', label: 'Projects' },
  { href: '/events', label: 'Events' },
  { href: '/transparency', label: 'Transparency' },
]

const EventsPage: FC<{ events: Event[] }> = ({ events }) => (
  <PublicLayout
    title="Events — Maa Nanda Kansuwa Trust"
    navLinks={NAV_LINKS}
  >
    <main class="py-12 md:py-20 px-4">
      <div class="max-w-6xl mx-auto p-8 md:p-12 rounded-xl glass-panel">

        <section id="events">
          <h1 class="text-3xl md:text-4xl font-serif font-light text-amber-100/90 mb-4 tracking-wider text-center">Trust Events</h1>
          <p class="text-center text-white/70 mb-10 md:mb-12">Upcoming and past events organized by the trust.</p>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
            {events.map((event) => (
              <a href={`/events/${event.id}`} class="block transition-transform hover:scale-105 h-full">
                <EventCard event={event} />
              </a>
            ))}
          </div>
        </section>

      </div>
    </main>
  </PublicLayout>
)

export default EventsPage
