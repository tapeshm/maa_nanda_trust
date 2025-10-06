import { Hono } from 'hono'
import type { Bindings } from '../bindings'
import content from './content'
import admin from './admin/index'
import media from './media'

/**
 * Aggregate route modules. Additional feature routers will be mounted here as
 * they are implemented. For now we only expose the public content routes.
 */
const routes = new Hono<{ Bindings: Bindings }>()

// Mount admin before content to avoid content's catch-all matching /admin
routes.route('/admin', admin)
routes.route('/media', media)
routes.route('/', content)

export default routes
