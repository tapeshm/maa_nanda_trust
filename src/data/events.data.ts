import type { Bindings } from '../bindings'
import type { Localized } from '../utils/i18n'
import {
  type Language,
  DEFAULT_LANGUAGE,
  parseLocalized,
  parseLocalizedRaw,
  serializeLocalized
} from '../utils/i18n'

export interface Event {
  id: string
  title: string
  description: string
  longDescription: string
  imageUrl: string
  location: string
  startDate: string // ISO 8601 YYYY-MM-DD
  displayDate: string // e.g. "Jan 19-25, 2026"
  status: 'Upcoming' | 'Completed' | 'Postponed'
  contactPerson: {
    name: string
    avatarUrl: string
  }
  createdAt?: number
  updatedAt?: number
}

export interface EventRaw {
  id: string
  title: Localized<string>
  description: Localized<string>
  longDescription: Localized<string>
  imageUrl: string
  location: Localized<string>
  startDate: string // ISO 8601 YYYY-MM-DD
  displayDate: Localized<string> // e.g. "Jan 19-25, 2026"
  status: 'Upcoming' | 'Completed' | 'Postponed'
  contactPerson: {
    name: string
    avatarUrl: string
  }
  createdAt?: number
  updatedAt?: number
}

export async function getEvents(env: Bindings, lang: Language = DEFAULT_LANGUAGE): Promise<Event[]> {
  const { results } = await env.DB.prepare('SELECT * FROM events ORDER BY startDate ASC').all<any>()
  return results.map(e => {
    const contactPerson = typeof e.contactPerson === 'string' ? JSON.parse(e.contactPerson) : e.contactPerson;

    return {
      ...e,
      title: parseLocalized(e.title, lang),
      description: parseLocalized(e.description, lang),
      longDescription: parseLocalized(e.longDescription, lang),
      location: parseLocalized(e.location, lang),
      displayDate: parseLocalized(e.displayDate, lang),
      contactPerson,
    };
  });
}

export async function getEventById(env: Bindings, id: string, lang: Language = DEFAULT_LANGUAGE): Promise<Event | null> {
  const stmt = env.DB.prepare('SELECT * FROM events WHERE id = ? LIMIT 1');
  const event = await stmt.bind(id).first<any>();

  if (!event) {
    return null;
  }

  const contactPerson = typeof event.contactPerson === 'string' ? JSON.parse(event.contactPerson) : event.contactPerson;

  return {
    ...event,
    title: parseLocalized(event.title, lang),
    description: parseLocalized(event.description, lang),
    longDescription: parseLocalized(event.longDescription, lang),
    location: parseLocalized(event.location, lang),
    displayDate: parseLocalized(event.displayDate, lang),
    contactPerson,
  };
}

export async function getEventByIdRaw(env: Bindings, id: string): Promise<EventRaw | null> {
  const stmt = env.DB.prepare('SELECT * FROM events WHERE id = ? LIMIT 1');
  const event = await stmt.bind(id).first<any>();

  if (!event) {
    return null;
  }

  const contactPerson = typeof event.contactPerson === 'string' ? JSON.parse(event.contactPerson) : event.contactPerson;

  return {
    ...event,
    title: parseLocalizedRaw(event.title),
    description: parseLocalizedRaw(event.description),
    longDescription: parseLocalizedRaw(event.longDescription),
    location: parseLocalizedRaw(event.location),
    displayDate: parseLocalizedRaw(event.displayDate),
    contactPerson,
  };
}

export async function upsertEvent(env: Bindings, event: Omit<EventRaw, 'createdAt' | 'updatedAt'>): Promise<void> {
    const { id, title, description, longDescription, imageUrl, location, startDate, displayDate, status, contactPerson } = event;

    const titleJson = serializeLocalized(title.en, title.hi);
    const descriptionJson = serializeLocalized(description.en, description.hi);
    const longDescriptionJson = serializeLocalized(longDescription.en, longDescription.hi);
    const locationJson = serializeLocalized(location.en, location.hi);
    const displayDateJson = serializeLocalized(displayDate.en, displayDate.hi);
    const contactPersonJson = JSON.stringify(contactPerson);

    await env.DB.prepare(
        `INSERT INTO events (id, title, description, longDescription, imageUrl, location, startDate, displayDate, status, contactPerson)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
           title = excluded.title,
           description = excluded.description,
           longDescription = excluded.longDescription,
           imageUrl = excluded.imageUrl,
           location = excluded.location,
           startDate = excluded.startDate,
           displayDate = excluded.displayDate,
           status = excluded.status,
           contactPerson = excluded.contactPerson,
           updatedAt = unixepoch()`
    )
    .bind(id, titleJson, descriptionJson, longDescriptionJson, imageUrl, locationJson, startDate, displayDateJson, status, contactPersonJson)
    .run()
}

export async function deleteEvent(env: Bindings, id: string): Promise<void> {
  await env.DB.prepare('DELETE FROM events WHERE id = ?').bind(id).run()
}
