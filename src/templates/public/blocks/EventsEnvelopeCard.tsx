/** @jsxImportSource hono/jsx */
import type { FC } from 'hono/jsx'

export interface EventsEnvelopeCardProps {
  title: string
  date: string
  location: string
  description: string
  linkHref: string
  linkLabel?: string
}

const EventsEnvelopeCard: FC<EventsEnvelopeCardProps> = ({
  title,
  date,
  location,
  description,
  linkHref,
  linkLabel = "Details"
}) => {
  return (
    <div class="envelope-wrapper" data-envelope-toggle>
      <div class="envelope">
        {/* The card inside */}
        <div class="card">
          <h3>{title}</h3>
          <p class="date">{date} • {location}</p>
          <p>{description}</p>
          <a href={linkHref} class="cta-link">{linkLabel}</a>
        </div>

        {/* The pocket and flap that form the envelope */}
        <div class="pocket"></div>
        <div class="pocket-bottom"></div>
        <div class="flap">
          <div class="seal">N</div>
        </div>

        {/* The new front content */}
        <div class="envelope-front">
          <p class="event-title">{title}</p>
          <p class="event-date">{date}</p>
        </div>
      </div>
    </div>
  )
}

export default EventsEnvelopeCard
