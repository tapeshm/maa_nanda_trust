import { Hono } from 'hono'
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'
import type { Bindings } from '../../bindings'
import { requireAuth, requireAdmin } from '../../middleware/auth'
import { ensureCsrf } from '../../middleware/csrf'
import { upsertAboutContent } from '../../data/about.data'
import type { AboutPageContent, AboutValue, Trustee } from '../../data/about'
import { invalidateCachedPublicHtml } from '../../utils/pages/cache'

const app = new Hono<{ Bindings: Bindings }>()

const aboutSchema = z.object({
  hero_title: z.string(),
  hero_description: z.string(),
  mission_title: z.string(),
  mission_description: z.string(),
  vision_title: z.string(),
  vision_description: z.string(),
  story_title: z.string(),
  story_description: z.string(),
  // Zod validator for form data arrays is tricky with hono/zod-validator directly on parsed body if it's not JSON.
  // We'll handle the values array manually in the handler to be safe with FormData structure.
})

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
    
    // Manual extraction for simple fields to match schema or use schema validation if adapted
    const hero_title = (formData['hero_title'] as string) || ''
    const hero_description = (formData['hero_description'] as string) || ''
    const mission_title = (formData['mission_title'] as string) || ''
    
    // Editor content extraction - checking flat keys first, then nested object
    const mission_description = (formData['content_html[mission-editor]'] as string) || 
                                ((formData.content_html as Record<string, string>)?.[ 'mission-editor']) || 
                                '';
    
    const vision_title = (formData['vision_title'] as string) || ''
    const vision_description = (formData['vision_description'] as string) || ''
    const story_title = (formData['story_title'] as string) || ''
    
    // Editor content extraction
    const story_description = (formData['content_html[story-editor]'] as string) || 
                              ((formData.content_html as Record<string, string>)?.[ 'story-editor']) || 
                              '';

    // Handle values array
    const values_titles = formData['values_title[]']
    const values_descriptions = formData['values_description[]']
    
    const values: AboutValue[] = []
    
    if (values_titles && values_descriptions) {
        const titles = Array.isArray(values_titles) ? values_titles : [values_titles]
        const descriptions = Array.isArray(values_descriptions) ? values_descriptions : [values_descriptions]
        
        for(let i = 0; i < titles.length; i++) {
            if (titles[i] && descriptions[i]) {
                values.push({
                    title: titles[i] as string,
                    description: descriptions[i] as string
                })
            }
        }
    }

    // Handle trustees array
    const trustees_names = formData['trustees_name[]']
    const trustees_roles = formData['trustees_role[]']
    const trustees_bios = formData['trustees_bio[]']
    const trustees_images = formData['trustees_image_url[]']

    const trustees: Trustee[] = []

    if (trustees_names) { // Assuming name is required minimum
        const names = Array.isArray(trustees_names) ? trustees_names : [trustees_names];
        // Normalize others to arrays of same length or empty strings if undefined
        // Note: parseBody returns string or array of strings. If single item, it's a string.
        
        const toArray = (val: unknown, len: number): string[] => {
             if (!val) return new Array(len).fill('');
             if (Array.isArray(val)) return val.map(String);
             return [String(val)]; // If single value but names has multiple, this might misalign if form logic is broken, but typically HTML forms send matching arrays.
             // Actually, standard HTML forms only send keys for populated inputs. If a bio is empty, it might be missing or empty string.
             // To be safe, we assume the client sends empty strings for empty fields or we rely on index.
             // For robust parsing, we usually rely on the index alignment from the client side ensuring all fields are sent.
        };

        const len = names.length;
        const roles = toArray(trustees_roles, len);
        const bios = toArray(trustees_bios, len);
        const images = toArray(trustees_images, len);

        for (let i = 0; i < len; i++) {
            if (names[i]) {
                trustees.push({
                    name: names[i] as string,
                    role: roles[i] || '',
                    bio: bios[i] || '',
                    imageUrl: images[i] || ''
                });
            }
        }
    }

    const content: AboutPageContent = {
      hero: {
        title: hero_title,
        description: hero_description,
      },
      mission: {
        title: mission_title,
        description: mission_description,
      },
      vision: {
        title: vision_title,
        description: vision_description,
      },
      values: values,
      trustees: trustees,
      story: {
        title: story_title,
        description: story_description,
      },
    }

    try {
      await upsertAboutContent(c.env, content)
      await invalidateCachedPublicHtml(c.env, 'about')
      return c.redirect('/admin/dashboard/about-us?success=true')
    } catch (e) {
      console.error('Failed to save about content:', e)
      return c.redirect('/admin/dashboard/about-us?error=save_failed')
    }
  },
)

export default app
