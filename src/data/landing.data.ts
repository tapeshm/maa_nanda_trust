import type { Bindings } from '../bindings'
import type { LandingPageContent } from './landing'

export const DEFAULT_LANDING_CONTENT: LandingPageContent = {
  hero: {
    eyebrow: "Maa Nanda Kansuwa Trust",
    title: "Enter the Divine Resonance",
    description: "Guided by centuries of Himalayan devotion, the temple opens its doors to every seeker with warmth, wisdom, and seva."
  },
  welcome: {
    title: "Rajrajeshwari Mandir",
    description: "In the heart of the Garhwal Himalayas, the Maa Nanda Devi Trust is dedicated to preserving the sacred heritage of the Rajrajeshwari Mandir, fostering community well-being, and living in service to the divine feminine."
  },
  projectsSection: {
    title: "Our Projects",
    description: "Current initiatives and ongoing service projects."
  },
  eventsSection: {
    title: "Upcoming Events",
    description: "Join us for festivals, workshops, and community gatherings."
  }
};

export async function getLandingContent(env: Bindings): Promise<LandingPageContent> {
  try {
    const row = await env.DB.prepare('SELECT * FROM landing_content WHERE id = 1').first();
    
    if (!row) {
        return DEFAULT_LANDING_CONTENT;
    }

    return {
      hero: {
        eyebrow: row.hero_eyebrow as string,
        title: row.hero_title as string,
        description: row.hero_description as string,
      },
      welcome: {
        title: row.welcome_title as string,
        description: row.welcome_description as string,
      },
      projectsSection: {
        title: row.projects_title as string,
        description: row.projects_description as string,
      },
      eventsSection: {
        title: row.events_title as string,
        description: row.events_description as string,
      }
    };
  } catch (e) {
    console.error("Failed to fetch landing content, using default", e);
    return DEFAULT_LANDING_CONTENT;
  }
}

export async function upsertLandingContent(env: Bindings, content: LandingPageContent): Promise<void> {
  await env.DB.prepare(`
    UPDATE landing_content SET
      hero_eyebrow = ?,
      hero_title = ?,
      hero_description = ?,
      welcome_title = ?,
      welcome_description = ?,
      projects_title = ?,
      projects_description = ?,
      events_title = ?,
      events_description = ?,
      updatedAt = unixepoch()
    WHERE id = 1
  `).bind(
    content.hero.eyebrow,
    content.hero.title,
    content.hero.description,
    content.welcome.title,
    content.welcome.description,
    content.projectsSection.title,
    content.projectsSection.description,
    content.eventsSection.title,
    content.eventsSection.description
  ).run();
}
