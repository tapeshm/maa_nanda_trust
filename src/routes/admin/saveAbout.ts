import { Hono } from 'hono'
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'
import type { Bindings } from '../../bindings'
import { requireAuth, requireAdmin } from '../../middleware/auth'
import { ensureCsrf } from '../../middleware/csrf'
import { upsertAboutContent } from '../../data/about.data'
import type { AboutPageContentRaw, AboutValueRaw, TrusteeRaw } from '../../data/about'
import { invalidateCachedPublicHtml } from '../../utils/pages/cache'

const app = new Hono<{ Bindings: Bindings }>()

app.post(
  '/dashboard/about-us/save',
  requireAuth(),
  requireAdmin,
  async (c, next) => {
    ensureCsrf(c)
    await next()
  },
  async (c) => {
    const formData = await c.req.parseBody({ all: true })
    
    // Helper
    const get = (key: string) => (formData[key] as string) || '';
    const getEditor = (id: string) => (formData[`content_html[${id}]`] as string) || ((formData.content_html as Record<string, string>)?.[id]) || '';

    // Hero
    const hero_title_en = get('hero_title_en');
    const hero_title_hi = get('hero_title_hi');
    const hero_description_en = get('hero_description_en');
    const hero_description_hi = get('hero_description_hi');

    // Mission
    const mission_title_en = get('mission_title_en');
    const mission_title_hi = get('mission_title_hi');
    const mission_description_en = getEditor('mission-editor-en');
    const mission_description_hi = getEditor('mission-editor-hi');
    
    // Vision
    const vision_title_en = get('vision_title_en');
    const vision_title_hi = get('vision_title_hi');
    const vision_description_en = get('vision_description_en');
    const vision_description_hi = get('vision_description_hi');

    // Story
    const story_title_en = get('story_title_en');
    const story_title_hi = get('story_title_hi');
    const story_description_en = getEditor('story-editor-en');
    const story_description_hi = getEditor('story-editor-hi');

    // Helper for arrays
    const toArray = (val: unknown, len: number): string[] => {
         if (!val) return new Array(len).fill('');
         if (Array.isArray(val)) return val.map(String);
         return [String(val)];
    };

    // Values
    const valTitlesEn = formData['values_title_en[]'];
    const valTitlesHi = formData['values_title_hi[]'];
    const valDescsEn = formData['values_description_en[]'];
    const valDescsHi = formData['values_description_hi[]'];
    
    const values: AboutValueRaw[] = [];
    
    if (valTitlesEn) {
        const titlesEn = Array.isArray(valTitlesEn) ? valTitlesEn : [valTitlesEn];
        const len = titlesEn.length;
        
        const titlesHi = toArray(valTitlesHi, len);
        const descsEn = toArray(valDescsEn, len);
        const descsHi = toArray(valDescsHi, len);
        
        for(let i = 0; i < len; i++) {
            values.push({
                title: { en: titlesEn[i] as string, hi: titlesHi[i] },
                description: { en: descsEn[i], hi: descsHi[i] }
            })
        }
    }

    // Trustees
    const trustNamesEn = formData['trustees_name_en[]'];
    const trustNamesHi = formData['trustees_name_hi[]'];
    const trustRolesEn = formData['trustees_role_en[]'];
    const trustRolesHi = formData['trustees_role_hi[]'];
    const trustBiosEn = formData['trustees_bio_en[]'];
    const trustBiosHi = formData['trustees_bio_hi[]'];
    const trustImages = formData['trustees_image_url[]'];

    const trustees: TrusteeRaw[] = [];

    if (trustNamesEn) { 
        const namesEn = Array.isArray(trustNamesEn) ? trustNamesEn : [trustNamesEn];
        const len = namesEn.length;

        const namesHi = toArray(trustNamesHi, len);
        const rolesEn = toArray(trustRolesEn, len);
        const rolesHi = toArray(trustRolesHi, len);
        const biosEn = toArray(trustBiosEn, len);
        const biosHi = toArray(trustBiosHi, len);
        const images = toArray(trustImages, len);

        for (let i = 0; i < len; i++) {
            trustees.push({
                name: { en: namesEn[i] as string, hi: namesHi[i] },
                role: { en: rolesEn[i], hi: rolesHi[i] },
                bio: { en: biosEn[i], hi: biosHi[i] },
                imageUrl: images[i]
            });
        }
    }

    const content: AboutPageContentRaw = {
      hero: {
        title: { en: hero_title_en, hi: hero_title_hi },
        description: { en: hero_description_en, hi: hero_description_hi },
      },
      mission: {
        title: { en: mission_title_en, hi: mission_title_hi },
        description: { en: mission_description_en, hi: mission_description_hi },
      },
      vision: {
        title: { en: vision_title_en, hi: vision_title_hi },
        description: { en: vision_description_en, hi: vision_description_hi },
      },
      values: values,
      trustees: trustees,
      story: {
        title: { en: story_title_en, hi: story_title_hi },
        description: { en: story_description_en, hi: story_description_hi },
      },
    }

    try {
      await upsertAboutContent(c.env, content)
      await invalidateCachedPublicHtml(c.env, 'about')
      await invalidateCachedPublicHtml(c.env, 'about:en')
      await invalidateCachedPublicHtml(c.env, 'about:hi')
      return c.redirect('/admin/dashboard/about-us?success=true')
    } catch (e) {
      console.error('Failed to save about content:', e)
      return c.redirect('/admin/dashboard/about-us?error=save_failed')
    }
  },
)

export default app