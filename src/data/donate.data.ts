import type { Bindings } from '../bindings'
import type { DonatePageContent, DonatePageContentRaw } from './donate'
import { DEFAULT_DONATE_CONTENT } from './donate'
import { 
  type Language, 
  DEFAULT_LANGUAGE, 
  parseLocalized, 
  parseLocalizedRaw, 
  serializeLocalized 
} from '../utils/i18n'

export async function getDonateContent(env: Bindings, lang: Language = DEFAULT_LANGUAGE): Promise<DonatePageContent> {
  try {
    const row = await env.DB.prepare('SELECT * FROM donate_content WHERE id = 1').first();
    
    if (!row) {
        return DEFAULT_DONATE_CONTENT;
    }

    return {
      qrCodeUrl: row.qr_code_url as string,
      appeal: parseLocalized(row.appeal as string, lang),
    };
  } catch (e) {
    console.error("Failed to fetch donate content, using default", e);
    return DEFAULT_DONATE_CONTENT;
  }
}

export async function getDonateContentRaw(env: Bindings): Promise<DonatePageContentRaw> {
  try {
    const row = await env.DB.prepare('SELECT * FROM donate_content WHERE id = 1').first();
    
    const defaultRaw: DonatePageContentRaw = {
        qrCodeUrl: DEFAULT_DONATE_CONTENT.qrCodeUrl,
        appeal: { en: DEFAULT_DONATE_CONTENT.appeal, hi: '' }
    };

    if (!row) return defaultRaw;

    return {
      qrCodeUrl: row.qr_code_url as string,
      appeal: parseLocalizedRaw(row.appeal as string),
    };
  } catch (e) {
    return {
        qrCodeUrl: DEFAULT_DONATE_CONTENT.qrCodeUrl,
        appeal: { en: DEFAULT_DONATE_CONTENT.appeal, hi: '' }
    };
  }
}

export async function upsertDonateContent(env: Bindings, content: DonatePageContentRaw): Promise<void> {
  await env.DB.prepare(`
    UPDATE donate_content SET
      qr_code_url = ?,
      appeal = ?,
      updatedAt = unixepoch()
    WHERE id = 1
  `).bind(
    content.qrCodeUrl,
    serializeLocalized(content.appeal.en, content.appeal.hi)
  ).run();
}