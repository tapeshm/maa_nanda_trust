/** @jsxImportSource hono/jsx */

import { Hono } from 'hono';
import type { Bindings } from '../../bindings';
import { requireAuth, requireAdmin } from '../../middleware/auth';
import { getCsrfParsedBody } from '../../middleware/csrf';
import { deleteProject } from '../../data/projects.data';

const deleteProjectRoute = new Hono<{ Bindings: Bindings }>();

deleteProjectRoute.post('/delete/project', requireAuth(), requireAdmin, async (c) => {
    const body = await getCsrfParsedBody(c);
    const id = body.id as string;

    if (!id) {
        return c.redirect('/admin/dashboard/projects?error=missing_id');
    }

    try {
        await deleteProject(c.env, id);
        return c.redirect('/admin/dashboard/projects');
    } catch (error) {
        console.error("Error deleting project:", error);
        return c.redirect('/admin/dashboard/projects?error=delete_failed');
    }
});

export default deleteProjectRoute;
