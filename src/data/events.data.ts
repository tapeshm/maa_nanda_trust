import type { Bindings } from '../bindings'

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

export async function getEvents(env: Bindings): Promise<Event[]> {
  const { results } = await env.DB.prepare('SELECT * FROM events ORDER BY startDate ASC').all<Event>()
  return results.map(e => ({
      ...e,
      contactPerson: typeof e.contactPerson === 'string' ? JSON.parse(e.contactPerson) : e.contactPerson,
  }));
}

export async function getEventById(env: Bindings, id: string): Promise<Event | null> {
  const stmt = env.DB.prepare('SELECT * FROM events WHERE id = ? LIMIT 1');
  const event = await stmt.bind(id).first<Event | null>();

  if (!event) {
    return null;
  }

  return {
    ...event,
    contactPerson: typeof event.contactPerson === 'string' ? JSON.parse(event.contactPerson) : event.contactPerson,
  };
}

export async function upsertEvent(env: Bindings, event: Omit<Event, 'createdAt' | 'updatedAt'>): Promise<void> {
    const { id, title, description, longDescription, imageUrl, location, startDate, displayDate, status, contactPerson } = event;
    
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
    .bind(id, title, description, longDescription, imageUrl, location, startDate, displayDate, status, contactPersonJson)
    .run()
}

export async function deleteEvent(env: Bindings, id: string): Promise<void> {
  await env.DB.prepare('DELETE FROM events WHERE id = ?').bind(id).run()
}
