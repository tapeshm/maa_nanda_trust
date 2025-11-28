/** @jsxImportSource hono/jsx */

import { Hono } from 'hono';
import type { Bindings } from '../../bindings';
import { requireAuth, requireAdmin } from '../../middleware/auth';
import { getCsrfParsedBody } from '../../middleware/csrf';
import { upsertEvent } from '../../data/events.data';
import type { Event } from '../../data/events.data';
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
            const title = body.title as string;
            if (!title) {
                throw new Error("Title is required to generate a slug.");
            }
            id = slugify(title);
            if (!id) {
                 id = 'event-' + Date.now().toString().slice(-6);
            }
        }

        const imageUrl = (body.imageUrl as string) || '';

        // --- Handle Content (Long Description) ---
        const editorId = 'event-long-description';
        
        const rawHtml = (body[`content_html[${editorId}]`] as string) || 
                        ((body.content_html as Record<string, string>)?.[editorId]) || 
                        '';

        const rawJson = (body[`content_json[${editorId}]`] as string) || 
                        ((body.content_json as Record<string, string>)?.[editorId]) || 
                        '';

        let longDescription = '';

        if (rawHtml.length > CONTENT_MAX_BYTES) {
             console.error("Content too large");
             return c.redirect('/admin/dashboard/events?error=content_too_large');
        }

        const profile = resolveEditorProfile('full');
        const context = { profile, slug: id, documentId: editorId };

        if (rawHtml) {
            const normalizedHtml = normalizeEditorHtmlWhitespace(rawHtml);
            if (isSafeEditorHtml(normalizedHtml, context)) {
                longDescription = normalizedHtml;
            } else {
                console.warn("Unsafe HTML detected, falling back to JSON rendering");
                 try {
                    const parsedJson = JSON.parse(rawJson);
                    longDescription = renderFallbackHtml(parsedJson, context);
                } catch (e) {
                    console.error("Failed to parse JSON content for fallback", e);
                    longDescription = '';
                }
            }
        } else if (rawJson) {
             try {
                const parsedJson = JSON.parse(rawJson);
                longDescription = renderFallbackHtml(parsedJson, context);
            } catch (e) {
                console.error("Failed to parse JSON content", e);
                longDescription = '';
            }
        }

        const event: Omit<Event, 'createdAt' | 'updatedAt'> = {
            id: id,
            title: body.title as string,
            description: body.description as string,
            longDescription: longDescription,
            imageUrl: imageUrl,
            location: body.location as string,
            startDate: body.startDate as string,
            displayDate: body.displayDate as string,
            status: body.status as 'Upcoming' | 'Completed' | 'Postponed',
            contactPerson: {
                name: (body.contactName as string) || '',
                avatarUrl: (body.contactAvatar as string) || ''
            },
        };

        await upsertEvent(c.env, event);

        await invalidateCachedPublicHtml(c.env, 'events:list');
        await invalidateCachedPublicHtml(c.env, `events:detail:${id}`);
        await invalidateCachedPublicHtml(c.env, 'landing');

        return c.redirect('/admin/dashboard/events');

    } catch (error: any) {
        console.error("Error saving event:", error);
        return c.redirect('/admin/dashboard/events?error=true');
    }
});

export default saveEvent;
