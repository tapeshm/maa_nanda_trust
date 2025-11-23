import type { Bindings } from '../bindings'
import type { TransparencyPageContent, Document } from './transparency'
import { DEFAULT_TRANSPARENCY_CONTENT } from './transparency'

export async function getTransparencyContent(env: Bindings): Promise<TransparencyPageContent> {
  try {
    const row = await env.DB.prepare('SELECT * FROM transparency_content WHERE id = 1').first();
    
    if (!row) {
        return DEFAULT_TRANSPARENCY_CONTENT;
    }

    let propertyDetails: string[] = [];
    try {
        propertyDetails = JSON.parse(row.property_details_json as string);
    } catch (e) {
        propertyDetails = DEFAULT_TRANSPARENCY_CONTENT.propertyDetails;
    }

    let documents: Document[] = [];
    try {
        documents = JSON.parse(row.documents_json as string);
    } catch (e) {
        documents = DEFAULT_TRANSPARENCY_CONTENT.documents;
    }

    return {
      hero: {
        title: row.hero_title as string,
        description: row.hero_description as string,
      },
      trustDetails: {
        trustName: row.trust_name as string,
        registrationNumber: row.registration_number as string,
        dateOfRegistration: row.registration_date as string,
      },
      propertyDetails,
      documents,
    };
  } catch (e) {
    console.error("Failed to fetch transparency content, using default", e);
    return DEFAULT_TRANSPARENCY_CONTENT;
  }
}

export async function upsertTransparencyContent(env: Bindings, content: TransparencyPageContent): Promise<void> {
  await env.DB.prepare(`
    UPDATE transparency_content SET
      hero_title = ?,
      hero_description = ?,
      trust_name = ?,
      registration_number = ?,
      registration_date = ?,
      property_details_json = ?,
      documents_json = ?,
      updatedAt = unixepoch()
    WHERE id = 1
  `).bind(
    content.hero.title,
    content.hero.description,
    content.trustDetails.trustName,
    content.trustDetails.registrationNumber,
    content.trustDetails.dateOfRegistration,
    JSON.stringify(content.propertyDetails),
    JSON.stringify(content.documents)
  ).run();
}
