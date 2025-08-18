import type { FC } from 'hono/jsx'

/**
 * Minimal login page.  Basic Authentication is enforced by middleware rather
 * than this page; this template is only used as a fallback when the browser
 * fails to prompt for credentials.
 */
const LoginPage: FC = () => {
  return (
    <div class="max-w-md mx-auto text-center">
      <h1 class="text-2xl font-semibold mb-4">Login Required</h1>
      <p class="mb-4">
        This area is restricted.  Please provide your username and password via
        HTTP Basic Authentication.  Your browser will usually prompt you
        automatically.
      </p>
    </div>
  )
}

export default LoginPage