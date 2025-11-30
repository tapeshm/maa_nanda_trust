import type { Bindings } from '../bindings'
import type { TransparencyPageContent, TransparencyPageContentRaw, Document, DocumentRaw } from './transparency'
import { DEFAULT_TRANSPARENCY_CONTENT } from './transparency'
import { 
  type Language, 
  DEFAULT_LANGUAGE, 
  parseLocalized, 
  parseLocalizedRaw, 
  serializeLocalized,
  resolveLocalizedObject,
  resolveLocalizedObjectRaw
} from '../utils/i18n'

export async function getTransparencyContent(env: Bindings, lang: Language = DEFAULT_LANGUAGE): Promise<TransparencyPageContent> {
  try {
    const row = await env.DB.prepare('SELECT * FROM transparency_content WHERE id = 1').first();
    
    if (!row) {
        return DEFAULT_TRANSPARENCY_CONTENT;
    }

    let rawPropertyDetails: any[] = [];
    try {
        rawPropertyDetails = JSON.parse(row.property_details_json as string);
    } catch (e) {
        rawPropertyDetails = DEFAULT_TRANSPARENCY_CONTENT.propertyDetails;
    }
    const propertyDetails = Array.isArray(rawPropertyDetails) ? rawPropertyDetails.map(p => resolveLocalizedObject(p, lang)) : DEFAULT_TRANSPARENCY_CONTENT.propertyDetails;

    let rawDocuments: any[] = [];
    try {
        rawDocuments = JSON.parse(row.documents_json as string);
    } catch (e) {
        rawDocuments = DEFAULT_TRANSPARENCY_CONTENT.documents;
    }
    const documents: Document[] = Array.isArray(rawDocuments) ? rawDocuments.map(d => ({
        name: resolveLocalizedObject(d.name, lang),
        url: d.url,
        description: resolveLocalizedObject(d.description, lang)
    })) : DEFAULT_TRANSPARENCY_CONTENT.documents;

    return {
      hero: {
        title: parseLocalized(row.hero_title as string, lang),
        description: parseLocalized(row.hero_description as string, lang),
      },
      trustDetails: {
        trustName: parseLocalized(row.trust_name as string, lang),
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

export async function getTransparencyContentRaw(env: Bindings): Promise<TransparencyPageContentRaw> {
  try {
    const row = await env.DB.prepare('SELECT * FROM transparency_content WHERE id = 1').first();
    
    const defaultRaw: TransparencyPageContentRaw = {
        hero: { 
            title: { en: DEFAULT_TRANSPARENCY_CONTENT.hero.title, hi: '' }, 
            description: { en: DEFAULT_TRANSPARENCY_CONTENT.hero.description, hi: '' } 
        },
        trustDetails: {
            trustName: { en: DEFAULT_TRANSPARENCY_CONTENT.trustDetails.trustName, hi: '' },
            registrationNumber: DEFAULT_TRANSPARENCY_CONTENT.trustDetails.registrationNumber,
            dateOfRegistration: DEFAULT_TRANSPARENCY_CONTENT.trustDetails.dateOfRegistration
        },
        propertyDetails: DEFAULT_TRANSPARENCY_CONTENT.propertyDetails.map(p => ({ en: p, hi: '' })),
        documents: DEFAULT_TRANSPARENCY_CONTENT.documents.map(d => ({
            name: { en: d.name, hi: '' },
            url: d.url,
            description: { en: d.description, hi: '' }
        }))
    };

    if (!row) return defaultRaw;

    let rawPropertyDetails: any[] = [];
    try { rawPropertyDetails = JSON.parse(row.property_details_json as string); } catch { }
    const propertyDetails = Array.isArray(rawPropertyDetails) ? rawPropertyDetails.map(p => resolveLocalizedObjectRaw(p)) : defaultRaw.propertyDetails;

    let rawDocuments: any[] = [];
    try { rawDocuments = JSON.parse(row.documents_json as string); } catch { }
    const documents: DocumentRaw[] = Array.isArray(rawDocuments) ? rawDocuments.map(d => ({
        name: resolveLocalizedObjectRaw(d.name),
        url: d.url,
        description: resolveLocalizedObjectRaw(d.description)
    })) : defaultRaw.documents;

    return {
      hero: {
        title: parseLocalizedRaw(row.hero_title as string),
        description: parseLocalizedRaw(row.hero_description as string),
      },
      trustDetails: {
        trustName: parseLocalizedRaw(row.trust_name as string),
        registrationNumber: row.registration_number as string,
        dateOfRegistration: row.registration_date as string,
      },
      propertyDetails,
      documents,
    };
  } catch (e) {
    return {
        hero: { title: { en: '', hi: '' }, description: { en: '', hi: '' } },
        trustDetails: { trustName: { en: '', hi: '' }, registrationNumber: '', dateOfRegistration: '' },
        propertyDetails: [],
        documents: []
    };
  }
}

export async function upsertTransparencyContent(env: Bindings, content: TransparencyPageContentRaw): Promise<void> {
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
    serializeLocalized(content.hero.title.en, content.hero.title.hi),
    serializeLocalized(content.hero.description.en, content.hero.description.hi),
    serializeLocalized(content.trustDetails.trustName.en, content.trustDetails.trustName.hi),
    content.trustDetails.registrationNumber,
    content.trustDetails.dateOfRegistration,
    JSON.stringify(content.propertyDetails),
    JSON.stringify(content.documents)
  ).run();
}