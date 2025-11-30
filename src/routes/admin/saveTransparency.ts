import { Hono } from 'hono'
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'
import type { Bindings } from '../../bindings'
import { requireAuth, requireAdmin } from '../../middleware/auth'
import { ensureCsrf } from '../../middleware/csrf'
import { upsertTransparencyContent } from '../../data/transparency.data'
import type { TransparencyPageContentRaw, DocumentRaw } from '../../data/transparency'
import { invalidateCachedPublicHtml } from '../../utils/pages/cache'
import type { Localized } from '../../utils/i18n'

const app = new Hono<{ Bindings: Bindings }>()

app.post(
  '/dashboard/transparency/save',
  requireAuth(),
  requireAdmin,
  async (c, next) => {
    ensureCsrf(c)
    await next()
  },
  async (c) => {
    const formData = await c.req.parseBody({ all: true })
    const get = (key: string) => (formData[key] as string) || '';
    
    const hero_title_en = get('hero_title_en');
    const hero_title_hi = get('hero_title_hi');
    const hero_description_en = get('hero_description_en');
    const hero_description_hi = get('hero_description_hi');
    
    const trust_name_en = get('trust_name_en');
    const trust_name_hi = get('trust_name_hi');
    const registration_number = get('registration_number');
    const registration_date = get('registration_date');

    // Helper for arrays
    const toArray = (val: unknown, len: number): string[] => {
         if (!val) return new Array(len).fill('');
         if (Array.isArray(val)) return val.map(String);
         return [String(val)];
    };

    // Handle property details array
    const propEn = formData['property_details_en[]'];
    const propHi = formData['property_details_hi[]'];
    
    let propertyDetails: Localized<string>[] = [];
    if (propEn) {
        const inputsEn = Array.isArray(propEn) ? propEn : [propEn];
        const len = inputsEn.length;
        const inputsHi = toArray(propHi, len);
        
        for(let i=0; i<len; i++) {
            propertyDetails.push({ en: inputsEn[i] as string, hi: inputsHi[i] });
        }
    }

    // Handle documents array
    const docNamesEn = formData['document_names_en[]'];
    const docNamesHi = formData['document_names_hi[]'];
    const docUrls = formData['document_urls[]'];
    const docDescsEn = formData['document_descriptions_en[]'];
    const docDescsHi = formData['document_descriptions_hi[]'];

    const documents: DocumentRaw[] = []

    if (docNamesEn) {
        const namesEn = Array.isArray(docNamesEn) ? docNamesEn : [docNamesEn];
        const len = namesEn.length;
        
        const namesHi = toArray(docNamesHi, len);
        const urls = toArray(docUrls, len);
        const descsEn = toArray(docDescsEn, len);
        const descsHi = toArray(docDescsHi, len);

        for (let i = 0; i < len; i++) {
            documents.push({
                name: { en: namesEn[i] as string, hi: namesHi[i] },
                url: urls[i],
                description: { en: descsEn[i], hi: descsHi[i] }
            });
        }
    }

    const content: TransparencyPageContentRaw = {
      hero: {
        title: { en: hero_title_en, hi: hero_title_hi },
        description: { en: hero_description_en, hi: hero_description_hi },
      },
      trustDetails: {
        trustName: { en: trust_name_en, hi: trust_name_hi },
        registrationNumber: registration_number,
        dateOfRegistration: registration_date,
      },
      propertyDetails,
      documents,
    }

    try {
      await upsertTransparencyContent(c.env, content)
      await invalidateCachedPublicHtml(c.env, 'transparency')
      await invalidateCachedPublicHtml(c.env, 'transparency:en')
      await invalidateCachedPublicHtml(c.env, 'transparency:hi')
      return c.redirect('/admin/dashboard/transparency?success=true')
    } catch (e) {
      console.error('Failed to save transparency content:', e)
      return c.redirect('/admin/dashboard/transparency?error=save_failed')
    }
  },
)

export default app