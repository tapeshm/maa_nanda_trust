/** @jsxImportSource hono/jsx */

import { Hono } from 'hono';
import type { Bindings } from '../../bindings';
import { requireAuth, requireAdmin } from '../../middleware/auth';
import { getCsrfParsedBody } from '../../middleware/csrf';
import { deleteEvent } from '../../data/events.data';

const deleteEventRoute = new Hono<{ Bindings: Bindings }>();

deleteEventRoute.post('/delete/event', requireAuth(), requireAdmin, async (c) => {
    const body = await getCsrfParsedBody(c);
    const id = body.id as string;

    if (!id) {
        return c.redirect('/admin/dashboard/events?error=missing_id');
    }

    try {
        await deleteEvent(c.env, id);
        return c.redirect('/admin/dashboard/events');
    } catch (error) {
        console.error("Error deleting event:", error);
        return c.redirect('/admin/dashboard/events?error=delete_failed');
    }
});

export default deleteEventRoute;
