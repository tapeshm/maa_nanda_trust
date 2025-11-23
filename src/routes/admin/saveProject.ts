/** @jsxImportSource hono/jsx */

import { Hono } from 'hono';
import type { Bindings } from '../../bindings';
import { requireAuth, requireAdmin } from '../../middleware/auth';
import { getCsrfParsedBody } from '../../middleware/csrf';
import { upsertProject } from '../../data/projects.data';
import type { Project } from '../../data/projects';
import { slugify } from '../../utils/slugify';
import {
    normalizeEditorHtmlWhitespace,
    isSafeEditorHtml,
    renderFallbackHtml,
} from '../../utils/editor/render';
import { resolveEditorProfile } from '../../editor/constants';

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
            const title = body.title as string;
            if (!title) {
                throw new Error("Title is required to generate a slug.");
            }
            // Auto-generate ID from title
            id = slugify(title);
            
            // Fallback if slugify results in empty string (e.g. all special chars)
            if (!id) {
                 id = 'project-' + Date.now().toString().slice(-6);
            }
        }

        // --- Handle Image URL (from AJAX upload) ---
        // The form now sends 'imageUrl' which is populated by the client-side media picker.
        const imageUrl = (body.imageUrl as string) || '';

        // --- Handle Content (Long Description) ---
        const editorId = 'project-long-description';
        
        // Extract raw values - checking flat keys first for robustness with x-www-form-urlencoded
        const rawHtml = (body[`content_html[${editorId}]`] as string) || 
                        ((body.content_html as Record<string, string>)?.[editorId]) || 
                        '';

        const rawJson = (body[`content_json[${editorId}]`] as string) || 
                        ((body.content_json as Record<string, string>)?.[editorId]) || 
                        '';

        let longDescription = '';

        // Parse and Validate Content
        if (rawHtml.length > CONTENT_MAX_BYTES) {
             console.error("Content too large");
             return c.redirect('/admin/dashboard/projects?error=content_too_large');
        }

        const profile = resolveEditorProfile('full');
        const context = { profile, slug: id, documentId: editorId };

        if (rawHtml) {
            const normalizedHtml = normalizeEditorHtmlWhitespace(rawHtml);
            if (isSafeEditorHtml(normalizedHtml, context)) {
                longDescription = normalizedHtml;
            } else {
                console.warn("Unsafe HTML detected, falling back to JSON rendering");
                // If HTML is unsafe, try rendering from JSON
                 try {
                    const parsedJson = JSON.parse(rawJson);
                    longDescription = renderFallbackHtml(parsedJson, context);
                } catch (e) {
                    console.error("Failed to parse JSON content for fallback", e);
                    longDescription = ''; // Fail safe
                }
            }
        } else if (rawJson) {
             // No HTML, render from JSON
             try {
                const parsedJson = JSON.parse(rawJson);
                longDescription = renderFallbackHtml(parsedJson, context);
            } catch (e) {
                console.error("Failed to parse JSON content", e);
                longDescription = '';
            }
        }


        // Helper to ensure array
        const toArray = (val: unknown): string[] => {
            if (val === undefined || val === null) return [];
            if (Array.isArray(val)) return val.map(String);
            return [String(val)];
        };

        // Parse Team
        const teamRoles = toArray(body['teamRole[]']);
        const teamNames = toArray(body['teamName[]']);
        const team: { role: string; name: string }[] = [];

        for (let i = 0; i < Math.max(teamRoles.length, teamNames.length); i++) {
            const role = teamRoles[i]?.trim() || '';
            const name = teamNames[i]?.trim() || '';
            if (role || name) {
                team.push({ role, name });
            }
        }

        const project: Omit<Project, 'createdAt' | 'updatedAt'> = {
            id: id,
            title: body.title as string,
            description: body.description as string,
            longDescription: longDescription,
            imageUrl: imageUrl,
            location: body.location as string,
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

        return c.redirect('/admin/dashboard/projects');

    } catch (error: any) {
        console.error("Error saving project:", error);
        // Redirect back with an error message
        return c.redirect('/admin/dashboard/projects?error=true');
    }
});

export default saveProject;
