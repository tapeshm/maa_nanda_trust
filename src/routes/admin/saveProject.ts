/** @jsxImportSource hono/jsx */

import { Hono } from 'hono';
import type { Bindings } from '../../bindings';
import { requireAuth, requireAdmin } from '../../middleware/auth';
import { getCsrfParsedBody } from '../../middleware/csrf';
import { upsertProject } from '../../data/projects.data';
import type { ProjectRaw } from '../../data/projects';
import { slugify } from '../../utils/slugify';
import {
    normalizeEditorHtmlWhitespace,
    isSafeEditorHtml,
    renderFallbackHtml,
} from '../../utils/editor/render';
import { resolveEditorProfile } from '../../editor/constants';
import { invalidateCachedPublicHtml } from '../../utils/pages/cache';

const saveProject = new Hono<{ Bindings: Bindings }>();

// --- File Upload Helpers ---
const ALLOWED_MIME: Record<string, string[]> = {
  'image/png': ['png'],
  'image/jpeg': ['jpg', 'jpeg'],
  'image/webp': ['webp'],
}
const DEFAULT_MAX_BYTES = 5 * 1024 * 1024 // 5 MiB

function normalizeMime(type: string | null | undefined): string {
  if (!type) return ''
  const lower = type.toLowerCase()
  if (lower === 'image/jpg') return 'image/jpeg'
  return lower
}

function extensionFromFilename(name: string | null | undefined): string | null {
  if (!name) return null
  const idx = name.lastIndexOf('.')
  if (idx === -1 || idx === name.length - 1) return null
  return name.slice(idx + 1).toLowerCase()
}

function buildObjectKey(ext: string): string {
  const now = Date.now()
  const random = crypto.getRandomValues(new Uint32Array(2))
    .reduce((acc, val) => acc + val.toString(36), '')
  return `images/${now}_${random}.${ext}`
}

const CONTENT_MAX_BYTES = 262144; // 256KB Limit for content

// --- File Upload Helpers removed (handled by ui.ts / upload.ts) ---

saveProject.post('/save/project', requireAuth(), requireAdmin, async (c) => {
    const body = await getCsrfParsedBody(c);

    try {
        let id = body.id as string;
        if (!id) {
            const titleEn = body.title_en as string;
            if (!titleEn) {
                throw new Error("Title (English) is required to generate a slug.");
            }
            // Auto-generate ID from English title
            id = slugify(titleEn);

            // Fallback if slugify results in empty string (e.g. all special chars)
            if (!id) {
                 id = 'project-' + Date.now().toString().slice(-6);
            }
        }

        // --- Handle Image URL (from AJAX upload) ---
        // The form now sends 'imageUrl' which is populated by the client-side media picker.
        const imageUrl = (body.imageUrl as string) || '';

        // --- Handle Content (Long Description) - Bilingual ---
        const profile = resolveEditorProfile('full');

        // Process English long description
        const editorIdEn = 'project-long-description-en';
        const rawHtmlEn = (body[`content_html[${editorIdEn}]`] as string) ||
                          ((body.content_html as Record<string, string>)?.[editorIdEn]) ||
                          '';
        const rawJsonEn = (body[`content_json[${editorIdEn}]`] as string) ||
                          ((body.content_json as Record<string, string>)?.[editorIdEn]) ||
                          '';

        let longDescriptionEn = '';
        if (rawHtmlEn.length > CONTENT_MAX_BYTES) {
             console.error("English content too large");
             return c.redirect('/admin/dashboard/projects?error=content_too_large');
        }

        const contextEn = { profile, slug: id, documentId: editorIdEn };
        if (rawHtmlEn) {
            const normalizedHtml = normalizeEditorHtmlWhitespace(rawHtmlEn);
            if (isSafeEditorHtml(normalizedHtml, contextEn)) {
                longDescriptionEn = normalizedHtml;
            } else {
                console.warn("Unsafe English HTML detected, falling back to JSON rendering");
                try {
                    const parsedJson = JSON.parse(rawJsonEn);
                    longDescriptionEn = renderFallbackHtml(parsedJson, contextEn);
                } catch (e) {
                    console.error("Failed to parse English JSON content for fallback", e);
                    longDescriptionEn = '';
                }
            }
        } else if (rawJsonEn) {
             try {
                const parsedJson = JSON.parse(rawJsonEn);
                longDescriptionEn = renderFallbackHtml(parsedJson, contextEn);
            } catch (e) {
                console.error("Failed to parse English JSON content", e);
                longDescriptionEn = '';
            }
        }

        // Process Hindi long description
        const editorIdHi = 'project-long-description-hi';
        const rawHtmlHi = (body[`content_html[${editorIdHi}]`] as string) ||
                          ((body.content_html as Record<string, string>)?.[editorIdHi]) ||
                          '';
        const rawJsonHi = (body[`content_json[${editorIdHi}]`] as string) ||
                          ((body.content_json as Record<string, string>)?.[editorIdHi]) ||
                          '';

        let longDescriptionHi = '';
        if (rawHtmlHi.length > CONTENT_MAX_BYTES) {
             console.error("Hindi content too large");
             return c.redirect('/admin/dashboard/projects?error=content_too_large');
        }

        const contextHi = { profile, slug: id, documentId: editorIdHi };
        if (rawHtmlHi) {
            const normalizedHtml = normalizeEditorHtmlWhitespace(rawHtmlHi);
            if (isSafeEditorHtml(normalizedHtml, contextHi)) {
                longDescriptionHi = normalizedHtml;
            } else {
                console.warn("Unsafe Hindi HTML detected, falling back to JSON rendering");
                try {
                    const parsedJson = JSON.parse(rawJsonHi);
                    longDescriptionHi = renderFallbackHtml(parsedJson, contextHi);
                } catch (e) {
                    console.error("Failed to parse Hindi JSON content for fallback", e);
                    longDescriptionHi = '';
                }
            }
        } else if (rawJsonHi) {
             try {
                const parsedJson = JSON.parse(rawJsonHi);
                longDescriptionHi = renderFallbackHtml(parsedJson, contextHi);
            } catch (e) {
                console.error("Failed to parse Hindi JSON content", e);
                longDescriptionHi = '';
            }
        }


        // Helper to ensure array
        const toArray = (val: unknown): string[] => {
            if (val === undefined || val === null) return [];
            if (Array.isArray(val)) return val.map(String);
            return [String(val)];
        };

        // Parse Team - Bilingual roles
        const teamRolesEn = toArray(body['teamRole_en[]']);
        const teamRolesHi = toArray(body['teamRole_hi[]']);
        const teamNames = toArray(body['teamName[]']);
        const team: { role: { en: string; hi: string }; name: string }[] = [];

        for (let i = 0; i < Math.max(teamRolesEn.length, teamRolesHi.length, teamNames.length); i++) {
            const roleEn = teamRolesEn[i]?.trim() || '';
            const roleHi = teamRolesHi[i]?.trim() || '';
            const name = teamNames[i]?.trim() || '';
            if (roleEn || roleHi || name) {
                team.push({
                    role: { en: roleEn, hi: roleHi },
                    name: name
                });
            }
        }

        const project: Omit<ProjectRaw, 'createdAt' | 'updatedAt'> = {
            id: id,
            title: {
                en: (body.title_en as string) || '',
                hi: (body.title_hi as string) || ''
            },
            description: {
                en: (body.description_en as string) || '',
                hi: (body.description_hi as string) || ''
            },
            longDescription: {
                en: longDescriptionEn,
                hi: longDescriptionHi
            },
            imageUrl: imageUrl,
            location: {
                en: (body.location_en as string) || '',
                hi: (body.location_hi as string) || ''
            },
            startDate: body.startDate as string,
            status: body.status as 'Ongoing' | 'Completed' | 'Planned',
            endDate: body.endDate as string,
            budget: Number(body.budget) || 0,
            spent: Number(body.spent) || 0,
            contactPerson: {
                name: (body.contactName as string) || '',
                avatarUrl: (body.contactAvatar as string) || ''
            },
            team: team,
        };

        await upsertProject(c.env, project);

        // Invalidate cached HTML for both languages
        await invalidateCachedPublicHtml(c.env, 'projects:list:en');
        await invalidateCachedPublicHtml(c.env, 'projects:list:hi');
        await invalidateCachedPublicHtml(c.env, `projects:detail:${id}:en`);
        await invalidateCachedPublicHtml(c.env, `projects:detail:${id}:hi`);
        await invalidateCachedPublicHtml(c.env, 'landing:en');
        await invalidateCachedPublicHtml(c.env, 'landing:hi');

        return c.redirect('/admin/dashboard/projects');

    } catch (error: any) {
        console.error("Error saving project:", error);
        // Redirect back with an error message
        return c.redirect('/admin/dashboard/projects?error=true');
    }
});

export default saveProject;
