import { Hono } from 'hono'
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'
import type { Bindings } from '../../bindings'
import { requireAuth, requireAdmin } from '../../middleware/auth'
import { ensureCsrf } from '../../middleware/csrf'
import { upsertTransparencyContent } from '../../data/transparency.data'
import type { TransparencyPageContent, Document } from '../../data/transparency'

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
    
    const hero_title = (formData['hero_title'] as string) || ''
    const hero_description = (formData['hero_description'] as string) || ''
    const trust_name = (formData['trust_name'] as string) || ''
    const registration_number = (formData['registration_number'] as string) || ''
    const registration_date = (formData['registration_date'] as string) || ''

    // Handle property details array
    const property_details_input = formData['property_details[]']
    let propertyDetails: string[] = []
    if (property_details_input) {
        const inputs = Array.isArray(property_details_input) ? property_details_input : [property_details_input];
        propertyDetails = inputs.map(String).filter(s => s.length > 0);
    }

    // Handle documents array
    const doc_names = formData['document_names[]']
    const doc_urls = formData['document_urls[]']
    const doc_descriptions = formData['document_descriptions[]']

    const documents: Document[] = []

    if (doc_names) {
        const names = Array.isArray(doc_names) ? doc_names : [doc_names];
        
        const toArray = (val: unknown, len: number): string[] => {
             if (!val) return new Array(len).fill('');
             if (Array.isArray(val)) return val.map(String);
             return [String(val)];
        };

        const len = names.length;
        const urls = toArray(doc_urls, len);
        const descriptions = toArray(doc_descriptions, len);

        for (let i = 0; i < len; i++) {
            if (names[i]) {
                documents.push({
                    name: names[i] as string,
                    url: urls[i] || '',
                    description: descriptions[i] || ''
                });
            }
        }
    }

    const content: TransparencyPageContent = {
      hero: {
        title: hero_title,
        description: hero_description,
      },
      trustDetails: {
        trustName: trust_name,
        registrationNumber: registration_number,
        dateOfRegistration: registration_date,
      },
      propertyDetails,
      documents,
    }

    try {
      await upsertTransparencyContent(c.env, content)
      return c.redirect('/admin/dashboard/transparency?success=true')
    } catch (e) {
      console.error('Failed to save transparency content:', e)
      return c.redirect('/admin/dashboard/transparency?error=save_failed')
    }
  },
)

export default app
