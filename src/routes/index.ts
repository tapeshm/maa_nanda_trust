import { Hono } from 'hono'
import type { Bindings } from '../bindings'
import content from './content'
import admin from './admin/index'
import adminPages from './admin/pages'
import adminDashboard from './admin/dashboard'
import adminSave from './admin/save'
import adminPublish from './admin/publish'
import adminItems from './admin/items'
import previewPages from './preview/pages'
import publicPages from './public/pages'
import media from './media'

/**
 * Aggregate route modules. Additional feature routers will be mounted here as
 * they are implemented. For now we only expose the public content routes.
 */
const routes = new Hono<{ Bindings: Bindings }>()

// [D3:pages.step-02:aggregate] Mount new page routers alongside existing modules.
const adminAggregate = new Hono<{ Bindings: Bindings }>()
adminAggregate.route('/', admin)
adminAggregate.route('/', adminDashboard)
adminAggregate.route('/', adminPages)
adminAggregate.route('/', adminSave)
adminAggregate.route('/', adminPublish)
adminAggregate.route('/', adminItems)

routes.route('/admin', adminAggregate)
routes.route('/preview', previewPages)
routes.route('/', publicPages)
routes.route('/media', media)
routes.route('/', content)

export default routes
