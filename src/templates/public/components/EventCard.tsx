/** @jsxImportSource hono/jsx */
import type { FC } from 'hono/jsx'
import type { Event } from '../../../data/events.data'
import { resolveMediaUrl } from '../../../utils/pages/media'
import { type Language, DEFAULT_LANGUAGE } from '../../../utils/i18n'

const LABELS = {
  en: {
    contactPerson: 'Contact Person',
    status: {
      Upcoming: 'Upcoming',
      Completed: 'Completed',
      Postponed: 'Postponed',
    }
  },
  hi: {
    contactPerson: 'संपर्क व्यक्ति',
    status: {
      Upcoming: 'आगामी',
      Completed: 'पूर्ण',
      Postponed: 'स्थगित',
    }
  }
};

const EventCard: FC<{ event: Event; lang?: Language }> = ({ event, lang = DEFAULT_LANGUAGE }) => {
    const labels = LABELS[lang];
    const statusColor = {
        Upcoming: 'bg-green-500/20 text-green-300',
        Completed: 'bg-gray-500/20 text-gray-300',
        Postponed: 'bg-yellow-500/20 text-yellow-300',
    };

    return (
        <div class="bg-white/5 border border-white/10 rounded-lg p-6 flex flex-col h-full">
            <div class="flex justify-between items-start mb-4">
                <h3 class="text-xl font-serif font-semibold text-amber-200 pr-4">{event.title}</h3>
                <span class={`text-xs font-bold px-2 py-1 rounded-full whitespace-nowrap ${statusColor[event.status]}`}>
                    {labels.status[event.status]}
                </span>
            </div>
            <p class="text-sm text-white/70 mb-1">{event.displayDate || event.startDate}</p>
            <p class="text-sm text-white/70 mb-4">{event.location}</p>
            <p class="text-sm text-white/60 leading-relaxed">{event.description}</p>

            {event.contactPerson && (
                <div class="border-t border-white/10 mt-auto pt-4 flex items-center gap-3 mt-6">
                    {event.contactPerson.avatarUrl && (
                        <img src={resolveMediaUrl(event.contactPerson.avatarUrl)} alt={event.contactPerson.name} class="w-10 h-10 rounded-full border-2 border-white/20" />
                    )}
                    <div>
                        <p class="text-xs text-white/70">{labels.contactPerson}</p>
                        <p class="font-semibold text-white/90">{event.contactPerson.name}</p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default EventCard;
