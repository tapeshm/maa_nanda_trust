import type { FC } from 'hono/jsx'

const LoginPage: FC<{ error?: string | null; email?: string; redirectTo?: string }> = ({ error, email = '', redirectTo = '/' }) => {
  return (
    <div class="max-w-md mx-auto">
      <h1 class="text-2xl font-semibold mb-6 text-center">Log in</h1>
      {error ? (
        <div class="mb-4 rounded border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-700/40 dark:bg-red-900/20 dark:text-red-200">
          {error}
        </div>
      ) : null}
      <form method="post" action="/login" class="space-y-4">
        <input type="hidden" name="redirect_to" value={redirectTo} />
        <div>
          <label class="block text-sm font-medium mb-1" htmlFor="email">Email</label>
          <input
            id="email"
            name="email"
            type="email"
            required
            value={email}
            class="w-full rounded border px-3 py-2 bg-white dark:bg-gray-900"
            placeholder="you@example.com"
          />
        </div>
        <div>
          <label class="block text-sm font-medium mb-1" htmlFor="password">Password</label>
          <input
            id="password"
            name="password"
            type="password"
            required
            class="w-full rounded border px-3 py-2 bg-white dark:bg-gray-900"
            placeholder="••••••••"
          />
        </div>
        <div class="flex items-center justify-between">
          <button type="submit" class="inline-flex items-center rounded bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 dark:bg-indigo-500 dark:hover:bg-indigo-400">Sign in</button>
          <a href="/" class="text-sm text-gray-600 hover:text-gray-800 dark:text-gray-300 dark:hover:text-gray-200">Cancel</a>
        </div>
      </form>
    </div>
  )
}

export default LoginPage
