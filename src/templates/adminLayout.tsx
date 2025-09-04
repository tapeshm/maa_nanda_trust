import type { FC, PropsWithChildren } from 'hono/jsx'
import Layout from './layout'

/**
 * AdminLayout wraps the standard layout and forces `admin` to true so the
 * navigation bar includes a link back to the admin dashboard.  It accepts
 * the same `title` prop as the base layout.
 */
const AdminLayout: FC<{ title: string } & PropsWithChildren> = ({
  title,
  children,
}) => {
  return (
    <Layout title={title} admin={true} signedIn={true}>
      {children}
    </Layout>
  )
}

export default AdminLayout
