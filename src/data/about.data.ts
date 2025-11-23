import type { Bindings } from '../bindings'
import type { AboutPageContent, AboutValue, Trustee } from './about'
import { DEFAULT_ABOUT_CONTENT } from './about'

export async function getAboutContent(env: Bindings): Promise<AboutPageContent> {
  try {
    const row = await env.DB.prepare('SELECT * FROM about_content WHERE id = 1').first();
    
    if (!row) {
        return DEFAULT_ABOUT_CONTENT;
    }

    let values: AboutValue[] = [];
    try {
        values = JSON.parse(row.values_json as string);
    } catch (e) {
        console.error("Failed to parse about values JSON", e);
        values = DEFAULT_ABOUT_CONTENT.values;
    }

    let trustees: Trustee[] = [];
    try {
        trustees = JSON.parse(row.trustees_json as string);
        // If the array is empty (e.g. fresh migration), use default
        if (!Array.isArray(trustees) || trustees.length === 0) {
             trustees = DEFAULT_ABOUT_CONTENT.trustees;
        }
    } catch (e) {
        // If column doesn't exist yet or parse error, use default
        // console.error("Failed to parse about trustees JSON", e); 
        trustees = DEFAULT_ABOUT_CONTENT.trustees;
    }

    return {
      hero: {
        title: row.hero_title as string,
        description: row.hero_description as string,
      },
      mission: {
        title: row.mission_title as string,
        description: row.mission_description as string,
      },
      vision: {
        title: row.vision_title as string,
        description: row.vision_description as string,
      },
      values: values,
      trustees: trustees,
      story: {
        title: row.story_title as string,
        description: row.story_description as string,
      }
    };
  } catch (e) {
    console.error("Failed to fetch about content, using default", e);
    return DEFAULT_ABOUT_CONTENT;
  }
}

export async function upsertAboutContent(env: Bindings, content: AboutPageContent): Promise<void> {
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
    content.hero.title,
    content.hero.description,
    content.mission.title,
    content.mission.description,
    content.vision.title,
    content.vision.description,
    JSON.stringify(content.values),
    JSON.stringify(content.trustees),
    content.story.title,
    content.story.description
  ).run();
}
