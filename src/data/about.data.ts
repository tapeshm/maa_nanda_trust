import type { Bindings } from '../bindings'
import type { AboutPageContent, AboutPageContentRaw, AboutValue, AboutValueRaw, Trustee, TrusteeRaw } from './about'
import { DEFAULT_ABOUT_CONTENT } from './about'
import { 
  type Language, 
  DEFAULT_LANGUAGE, 
  parseLocalized, 
  parseLocalizedRaw, 
  serializeLocalized,
  resolveLocalizedObject,
  resolveLocalizedObjectRaw
} from '../utils/i18n'

export async function getAboutContent(env: Bindings, lang: Language = DEFAULT_LANGUAGE): Promise<AboutPageContent> {
  try {
    const row = await env.DB.prepare('SELECT * FROM about_content WHERE id = 1').first();
    
    if (!row) {
        return DEFAULT_ABOUT_CONTENT;
    }

    let rawValues: any[] = [];
    try {
        rawValues = JSON.parse(row.values_json as string);
    } catch (e) {
        console.error("Failed to parse about values JSON", e);
        rawValues = DEFAULT_ABOUT_CONTENT.values;
    }
    
    const values: AboutValue[] = Array.isArray(rawValues) ? rawValues.map(v => ({
        title: resolveLocalizedObject(v.title, lang),
        description: resolveLocalizedObject(v.description, lang)
    })) : DEFAULT_ABOUT_CONTENT.values;

    let rawTrustees: any[] = [];
    try {
        rawTrustees = JSON.parse(row.trustees_json as string);
        if (!Array.isArray(rawTrustees) || rawTrustees.length === 0) {
             rawTrustees = DEFAULT_ABOUT_CONTENT.trustees;
        }
    } catch (e) {
        rawTrustees = DEFAULT_ABOUT_CONTENT.trustees;
    }

    const trustees: Trustee[] = Array.isArray(rawTrustees) ? rawTrustees.map(t => ({
        name: resolveLocalizedObject(t.name, lang),
        role: resolveLocalizedObject(t.role, lang),
        bio: resolveLocalizedObject(t.bio, lang),
        imageUrl: t.imageUrl || ''
    })) : DEFAULT_ABOUT_CONTENT.trustees;

    return {
      hero: {
        title: parseLocalized(row.hero_title as string, lang),
        description: parseLocalized(row.hero_description as string, lang),
      },
      mission: {
        title: parseLocalized(row.mission_title as string, lang),
        description: parseLocalized(row.mission_description as string, lang),
      },
      vision: {
        title: parseLocalized(row.vision_title as string, lang),
        description: parseLocalized(row.vision_description as string, lang),
      },
      values: values,
      trustees: trustees,
      story: {
        title: parseLocalized(row.story_title as string, lang),
        description: parseLocalized(row.story_description as string, lang),
      }
    };
  } catch (e) {
    console.error("Failed to fetch about content, using default", e);
    return DEFAULT_ABOUT_CONTENT;
  }
}

export async function getAboutContentRaw(env: Bindings): Promise<AboutPageContentRaw> {
  try {
    const row = await env.DB.prepare('SELECT * FROM about_content WHERE id = 1').first();
    
    // Helper to create default raw
    const defaultRaw: AboutPageContentRaw = {
        hero: {
            title: { en: DEFAULT_ABOUT_CONTENT.hero.title, hi: '' },
            description: { en: DEFAULT_ABOUT_CONTENT.hero.description, hi: '' }
        },
        mission: {
            title: { en: DEFAULT_ABOUT_CONTENT.mission.title, hi: '' },
            description: { en: DEFAULT_ABOUT_CONTENT.mission.description, hi: '' }
        },
        vision: {
            title: { en: DEFAULT_ABOUT_CONTENT.vision.title, hi: '' },
            description: { en: DEFAULT_ABOUT_CONTENT.vision.description, hi: '' }
        },
        values: DEFAULT_ABOUT_CONTENT.values.map(v => ({
            title: { en: v.title, hi: '' },
            description: { en: v.description, hi: '' }
        })),
        trustees: DEFAULT_ABOUT_CONTENT.trustees.map(t => ({
            name: { en: t.name, hi: '' },
            role: { en: t.role, hi: '' },
            bio: { en: t.bio, hi: '' },
            imageUrl: t.imageUrl
        })),
        story: {
            title: { en: DEFAULT_ABOUT_CONTENT.story.title, hi: '' },
            description: { en: DEFAULT_ABOUT_CONTENT.story.description, hi: '' }
        }
    };

    if (!row) return defaultRaw;

    let rawValues: any[] = [];
    try { rawValues = JSON.parse(row.values_json as string); } catch { }
    
    const values: AboutValueRaw[] = Array.isArray(rawValues) ? rawValues.map(v => ({
        title: resolveLocalizedObjectRaw(v.title),
        description: resolveLocalizedObjectRaw(v.description)
    })) : defaultRaw.values;

    let rawTrustees: any[] = [];
    try { rawTrustees = JSON.parse(row.trustees_json as string); } catch { }

    const trustees: TrusteeRaw[] = Array.isArray(rawTrustees) ? rawTrustees.map(t => ({
        name: resolveLocalizedObjectRaw(t.name),
        role: resolveLocalizedObjectRaw(t.role),
        bio: resolveLocalizedObjectRaw(t.bio),
        imageUrl: t.imageUrl || ''
    })) : defaultRaw.trustees;

    return {
      hero: {
        title: parseLocalizedRaw(row.hero_title as string),
        description: parseLocalizedRaw(row.hero_description as string),
      },
      mission: {
        title: parseLocalizedRaw(row.mission_title as string),
        description: parseLocalizedRaw(row.mission_description as string),
      },
      vision: {
        title: parseLocalizedRaw(row.vision_title as string),
        description: parseLocalizedRaw(row.vision_description as string),
      },
      values: values,
      trustees: trustees,
      story: {
        title: parseLocalizedRaw(row.story_title as string),
        description: parseLocalizedRaw(row.story_description as string),
      }
    };
  } catch (e) {
    return {
        hero: { title: { en: '', hi: '' }, description: { en: '', hi: '' } },
        mission: { title: { en: '', hi: '' }, description: { en: '', hi: '' } },
        vision: { title: { en: '', hi: '' }, description: { en: '', hi: '' } },
        values: [],
        trustees: [],
        story: { title: { en: '', hi: '' }, description: { en: '', hi: '' } }
    }; // Simplified fallback
  }
}

export async function upsertAboutContent(env: Bindings, content: AboutPageContentRaw): Promise<void> {
  await env.DB.prepare(`
    UPDATE about_content SET
      hero_title = ?,
      hero_description = ?,
      mission_title = ?,
      mission_description = ?,
      vision_title = ?,
      vision_description = ?,
      values_json = ?,
      trustees_json = ?,
      story_title = ?,
      story_description = ?,
      updatedAt = unixepoch()
    WHERE id = 1
  `).bind(
    serializeLocalized(content.hero.title.en, content.hero.title.hi),
    serializeLocalized(content.hero.description.en, content.hero.description.hi),
    serializeLocalized(content.mission.title.en, content.mission.title.hi),
    serializeLocalized(content.mission.description.en, content.mission.description.hi),
    serializeLocalized(content.vision.title.en, content.vision.title.hi),
    serializeLocalized(content.vision.description.en, content.vision.description.hi),
    JSON.stringify(content.values),
    JSON.stringify(content.trustees),
    serializeLocalized(content.story.title.en, content.story.title.hi),
    serializeLocalized(content.story.description.en, content.story.description.hi)
  ).run();
}