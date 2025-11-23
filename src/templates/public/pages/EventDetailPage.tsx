/** @jsxImportSource hono/jsx */

import type { FC } from 'hono/jsx'
import PublicLayout from '../layout/PublicLayout'
import type { PublicNavLink } from '../layout/PublicTopNav'
import type { Event } from '../../../data/events.data'
import RichText from '../../components/RichText'
import { resolveMediaUrl } from '../../../utils/pages/media'

const NAV_LINKS: PublicNavLink[] = [
  { href: '/', label: 'Home' },
  { href: '/about', label: 'About Us' },
  { href: '/projects', label: 'Projects' },
  { href: '/events', label: 'Events' },
  { href: '/transparency', label: 'Transparency' },
]

const EventDetailPage: FC<{ event: Event }> = ({ event }) => {
    const statusColor = {
        Upcoming: 'bg-green-500/20 text-green-300',
        Completed: 'bg-gray-500/20 text-gray-300',
        Postponed: 'bg-yellow-500/20 text-yellow-300',
    };

    return (
        <PublicLayout
            title={`${event.title} — Events`}
            navLinks={NAV_LINKS}
        >
            <main class="py-12 md:py-20 px-4">
            <div class="max-w-4xl mx-auto p-8 md:p-12 rounded-xl" style="background: rgba(14, 8, 4, 0.75); backdrop-filter: blur(12px); border: 1px solid rgba(255, 255, 255, 0.1);">

                {/* --- Header --- */}
                <section class="text-center mb-10">
                    <div class="flex flex-col md:flex-row justify-center items-center gap-4 mb-4">
                        <h1 class="text-3xl md:text-4xl font-serif font-light text-amber-100/90 tracking-wider">{event.title}</h1>
                        <span class={`text-sm font-bold px-3 py-1 rounded-full whitespace-nowrap ${statusColor[event.status]}`}>
                            {event.status}
                        </span>
                    </div>
                    <p class="text-amber-400/80 text-lg">{event.displayDate || event.startDate} • {event.location}</p>
                </section>

                {/* --- Image --- */}
                {event.imageUrl && (
                    <section class="mb-10">
                        <img src={resolveMediaUrl(event.imageUrl)} alt={`Image of ${event.title}`} class="rounded-lg shadow-lg w-full h-auto max-h-[400px] object-cover mx-auto" />
                    </section>
                )}

                {/* --- Description --- */}
                <section class="mb-10">
                    {event.longDescription ? (
                        <RichText
                            html={event.longDescription}
                            className="text-base md:text-lg text-white/80 leading-relaxed"
                        />
                    ) : (
                        <p class="text-base md:text-lg text-white/80 leading-relaxed text-center">
                            {event.description}
                        </p>
                    )}
                </section>

                {/* --- Contact Person --- */}
                {event.contactPerson && (
                    <section>
                        <h2 class="text-2xl font-serif text-center mb-6 text-amber-200/90">Contact Person</h2>
                        <div class="flex flex-col items-center">
                            <div class="text-center">
                                {event.contactPerson.avatarUrl && (
                                    <img src={event.contactPerson.avatarUrl} alt={event.contactPerson.name} class="w-24 h-24 rounded-full mx-auto mb-2 border-2 border-amber-400/50" />
                                )}
                                <h4 class="text-white/90 font-semibold text-lg">{event.contactPerson.name}</h4>
                            </div>
                        </div>
                    </section>
                )}

            </div>
            </main>
        </PublicLayout>
    )
}

export default EventDetailPage
