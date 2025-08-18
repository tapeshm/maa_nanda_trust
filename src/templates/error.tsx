import type { FC } from 'hono/jsx'

/**
 * Simple error page used for 404 and other error responses.  The message
 * passed in should be human readable.  See `src/index.tsx` for usage.
 */
const ErrorPage: FC<{ message: string; status?: number }> = ({
  message,
  status,
}) => {
  return (
    <div class="text-center py-12">
      <h1 class="text-3xl font-bold mb-4">{status || 500} Error</h1>
      <p class="text-lg text-gray-700">{message}</p>
    </div>
  )
}

export default ErrorPage