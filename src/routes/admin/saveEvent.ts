/** @jsxImportSource hono/jsx */

import { Hono } from 'hono';
import type { Bindings } from '../../bindings';
import { requireAuth, requireAdmin } from '../../middleware/auth';
import { getCsrfParsedBody } from '../../middleware/csrf';
import { upsertEvent } from '../../data/events.data';
import type { EventRaw } from '../../data/events.data';
import { slugify } from '../../utils/slugify';
import {
    normalizeEditorHtmlWhitespace,
    isSafeEditorHtml,
    renderFallbackHtml,
} from '../../utils/editor/render';
import { resolveEditorProfile } from '../../editor/constants';
import { invalidateCachedPublicHtml } from '../../utils/pages/cache';

const saveEvent = new Hono<{ Bindings: Bindings }>();

const CONTENT_MAX_BYTES = 262144; // 256KB Limit for content

saveEvent.post('/save/event', requireAuth(), requireAdmin, async (c) => {
    const body = await getCsrfParsedBody(c);

    try {
        let id = body.id as string;
        if (!id) {
            const titleEn = body.title_en as string;
            if (!titleEn) {
                throw new Error("Title (English) is required to generate a slug.");
            }
            id = slugify(titleEn);
            if (!id) {
                 id = 'event-' + Date.now().toString().slice(-6);
            }
        }

        const imageUrl = (body.imageUrl as string) || '';

        // --- Handle Content (Long Description) - Bilingual ---
        const profile = resolveEditorProfile('full');

        // Process English long description
        const editorIdEn = 'event-long-description-en';
        const rawHtmlEn = (body[`content_html[${editorIdEn}]`] as string) ||
                          ((body.content_html as Record<string, string>)?.[editorIdEn]) ||
                          '';
        const rawJsonEn = (body[`content_json[${editorIdEn}]`] as string) ||
                          ((body.content_json as Record<string, string>)?.[editorIdEn]) ||
                          '';

        let longDescriptionEn = '';
        if (rawHtmlEn.length > CONTENT_MAX_BYTES) {
             console.error("English content too large");
             return c.redirect('/admin/dashboard/events?error=content_too_large');
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
        const editorIdHi = 'event-long-description-hi';
        const rawHtmlHi = (body[`content_html[${editorIdHi}]`] as string) ||
                          ((body.content_html as Record<string, string>)?.[editorIdHi]) ||
                          '';
        const rawJsonHi = (body[`content_json[${editorIdHi}]`] as string) ||
                          ((body.content_json as Record<string, string>)?.[editorIdHi]) ||
                          '';

        let longDescriptionHi = '';
        if (rawHtmlHi.length > CONTENT_MAX_BYTES) {
             console.error("Hindi content too large");
             return c.redirect('/admin/dashboard/events?error=content_too_large');
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

        const event: Omit<EventRaw, 'createdAt' | 'updatedAt'> = {
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
            displayDate: {
                en: (body.displayDate_en as string) || '',
                hi: (body.displayDate_hi as string) || ''
            },
            status: body.status as 'Upcoming' | 'Completed' | 'Postponed',
            contactPerson: {
                name: (body.contactName as string) || '',
                avatarUrl: (body.contactAvatar as string) || ''
            },
        };

        await upsertEvent(c.env, event);

        // Invalidate cached HTML for both languages
        await invalidateCachedPublicHtml(c.env, 'events:list:en');
        await invalidateCachedPublicHtml(c.env, 'events:list:hi');
        await invalidateCachedPublicHtml(c.env, `events:detail:${id}:en`);
        await invalidateCachedPublicHtml(c.env, `events:detail:${id}:hi`);
        await invalidateCachedPublicHtml(c.env, 'landing:en');
        await invalidateCachedPublicHtml(c.env, 'landing:hi');

        return c.redirect('/admin/dashboard/events');

    } catch (error: any) {
        console.error("Error saving event:", error);
        return c.redirect('/admin/dashboard/events?error=true');
    }
});

export default saveEvent;
