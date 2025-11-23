import type { Bindings } from '../bindings'
import type { DonatePageContent } from './donate'
import { DEFAULT_DONATE_CONTENT } from './donate'

export async function getDonateContent(env: Bindings): Promise<DonatePageContent> {
  try {
    const row = await env.DB.prepare('SELECT * FROM donate_content WHERE id = 1').first();
    
    if (!row) {
        return DEFAULT_DONATE_CONTENT;
    }

    return {
      qrCodeUrl: row.qr_code_url as string,
      appeal: row.appeal as string,
    };
  } catch (e) {
    console.error("Failed to fetch donate content, using default", e);
    return DEFAULT_DONATE_CONTENT;
  }
}

export async function upsertDonateContent(env: Bindings, content: DonatePageContent): Promise<void> {
  await env.DB.prepare(`
    UPDATE donate_content SET
      qr_code_url = ?,
      appeal = ?,
      updatedAt = unixepoch()
    WHERE id = 1
  `).bind(
    content.qrCodeUrl,
    content.appeal
  ).run();
}
