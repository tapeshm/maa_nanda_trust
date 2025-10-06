type EnvLike = Record<string, unknown> | undefined

const LOCAL_HOSTS = new Set(['127.0.0.1', 'localhost', 'host.docker.internal', '0.0.0.0'])

export function resolveAuthIssuer(env: EnvLike): string | undefined {
  const supaUrl = env?.SUPABASE_URL
  if (!supaUrl || typeof supaUrl !== 'string') return undefined
  try {
    const u = new URL(supaUrl)
    const devLocal = String(env?.DEV_SUPABASE_LOCAL ?? '0') === '1'
    if (devLocal && LOCAL_HOSTS.has(u.hostname)) {
      u.hostname = '127.0.0.1'
    }
    return `${u.origin}/auth/v1`
  } catch {
    return undefined
  }
}

