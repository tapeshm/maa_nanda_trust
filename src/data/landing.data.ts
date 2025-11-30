import type { Bindings } from '../bindings'
import type { LandingPageContent, LandingPageContentRaw } from './landing'
import { 
  type Language, 
  DEFAULT_LANGUAGE, 
  parseLocalized, 
  parseLocalizedRaw, 
  serializeLocalized 
} from '../utils/i18n'

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

export async function getLandingContent(env: Bindings, lang: Language = DEFAULT_LANGUAGE): Promise<LandingPageContent> {
  try {
    const row = await env.DB.prepare('SELECT * FROM landing_content WHERE id = 1').first();
    
    if (!row) {
        return DEFAULT_LANDING_CONTENT;
    }

    return {
      hero: {
        eyebrow: parseLocalized(row.hero_eyebrow as string, lang),
        title: parseLocalized(row.hero_title as string, lang),
        description: parseLocalized(row.hero_description as string, lang),
      },
      welcome: {
        title: parseLocalized(row.welcome_title as string, lang),
        description: parseLocalized(row.welcome_description as string, lang),
      },
      projectsSection: {
        title: parseLocalized(row.projects_title as string, lang),
        description: parseLocalized(row.projects_description as string, lang),
      },
      eventsSection: {
        title: parseLocalized(row.events_title as string, lang),
        description: parseLocalized(row.events_description as string, lang),
      }
    };
  } catch (e) {
    console.error("Failed to fetch landing content, using default", e);
    return DEFAULT_LANDING_CONTENT;
  }
}

export async function getLandingContentRaw(env: Bindings): Promise<LandingPageContentRaw> {
  try {
    const row = await env.DB.prepare('SELECT * FROM landing_content WHERE id = 1').first();
    
    if (!row) {
      // Convert default to raw (english only)
      return {
        hero: {
          eyebrow: { en: DEFAULT_LANDING_CONTENT.hero.eyebrow, hi: '' },
          title: { en: DEFAULT_LANDING_CONTENT.hero.title, hi: '' },
          description: { en: DEFAULT_LANDING_CONTENT.hero.description, hi: '' },
        },
        welcome: {
          title: { en: DEFAULT_LANDING_CONTENT.welcome.title, hi: '' },
          description: { en: DEFAULT_LANDING_CONTENT.welcome.description, hi: '' },
        },
        projectsSection: {
          title: { en: DEFAULT_LANDING_CONTENT.projectsSection.title, hi: '' },
          description: { en: DEFAULT_LANDING_CONTENT.projectsSection.description, hi: '' },
        },
        eventsSection: {
          title: { en: DEFAULT_LANDING_CONTENT.eventsSection.title, hi: '' },
          description: { en: DEFAULT_LANDING_CONTENT.eventsSection.description, hi: '' },
        }
      };
    }

    return {
      hero: {
        eyebrow: parseLocalizedRaw(row.hero_eyebrow as string),
        title: parseLocalizedRaw(row.hero_title as string),
        description: parseLocalizedRaw(row.hero_description as string),
      },
      welcome: {
        title: parseLocalizedRaw(row.welcome_title as string),
        description: parseLocalizedRaw(row.welcome_description as string),
      },
      projectsSection: {
        title: parseLocalizedRaw(row.projects_title as string),
        description: parseLocalizedRaw(row.projects_description as string),
      },
      eventsSection: {
        title: parseLocalizedRaw(row.events_title as string),
        description: parseLocalizedRaw(row.events_description as string),
      }
    };
  } catch (e) {
    console.error("Failed to fetch raw landing content, using default", e);
    return {
        hero: {
          eyebrow: { en: DEFAULT_LANDING_CONTENT.hero.eyebrow, hi: '' },
          title: { en: DEFAULT_LANDING_CONTENT.hero.title, hi: '' },
          description: { en: DEFAULT_LANDING_CONTENT.hero.description, hi: '' },
        },
        welcome: {
          title: { en: DEFAULT_LANDING_CONTENT.welcome.title, hi: '' },
          description: { en: DEFAULT_LANDING_CONTENT.welcome.description, hi: '' },
        },
        projectsSection: {
          title: { en: DEFAULT_LANDING_CONTENT.projectsSection.title, hi: '' },
          description: { en: DEFAULT_LANDING_CONTENT.projectsSection.description, hi: '' },
        },
        eventsSection: {
          title: { en: DEFAULT_LANDING_CONTENT.eventsSection.title, hi: '' },
          description: { en: DEFAULT_LANDING_CONTENT.eventsSection.description, hi: '' },
        }
    };
  }
}

export async function upsertLandingContent(env: Bindings, content: LandingPageContentRaw): Promise<void> {
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
    serializeLocalized(content.hero.eyebrow.en, content.hero.eyebrow.hi),
    serializeLocalized(content.hero.title.en, content.hero.title.hi),
    serializeLocalized(content.hero.description.en, content.hero.description.hi),
    serializeLocalized(content.welcome.title.en, content.welcome.title.hi),
    serializeLocalized(content.welcome.description.en, content.welcome.description.hi),
    serializeLocalized(content.projectsSection.title.en, content.projectsSection.title.hi),
    serializeLocalized(content.projectsSection.description.en, content.projectsSection.description.hi),
    serializeLocalized(content.eventsSection.title.en, content.eventsSection.title.hi),
    serializeLocalized(content.eventsSection.description.en, content.eventsSection.description.hi)
  ).run();
}