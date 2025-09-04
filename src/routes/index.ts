import { Hono } from 'hono'
import type { Bindings } from '../bindings'
import content from './content'
import auth from './auth'
import finance from './finance'
import media from './media'
import admin from './admin'

/**
 * Aggregate all route modules under one router.  Mounting happens in
 * `src/index.tsx`.  Each route is namespaced by its own path prefix.
 */
const routes = new Hono<{ Bindings: Bindings }>()

// Auth first so /login and /logout are not swallowed by content slug route
routes.route('/', auth)
// Public pages and content
routes.route('/', content)
// // Finance listing and submission
// routes.route('/finance', finance)
// // Media upload and serving
// routes.route('/media', media)
// Admin dashboard and management
routes.route('/admin', admin)

export default routes
