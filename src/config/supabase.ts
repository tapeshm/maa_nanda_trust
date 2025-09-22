// [D3:auth.step-04:supabase-config]
import type { Context } from 'hono'
import { readEnv } from '../utils/env'

type EnvLike = unknown

export function getSupabaseUrl(envOrCtx: Context | EnvLike): string {
  const env = readEnv(envOrCtx)
  const url = env.SUPABASE_URL as string | undefined
  if (!url) throw new Error('SUPABASE_URL missing')
  return url.replace(/\/$/, '')
}

export function getSupabaseAnonKey(envOrCtx: Context | EnvLike): string {
  const env = readEnv(envOrCtx)
  const key = (env.SUPABASE_ANON_KEY || env.SUPABASE_PUBLISHABLE_KEY) as string | undefined
  if (!key) throw new Error('SUPABASE_ANON_KEY missing')
  return key
}

export function getTokenEndpoint(envOrCtx: Context | EnvLike): string {
  return `${getSupabaseUrl(envOrCtx)}/auth/v1/token`
}

export function buildAuthHeaders(envOrCtx: Context | EnvLike): HeadersInit {
  const anon = getSupabaseAnonKey(envOrCtx)
  return {
    apikey: anon,
    Authorization: `Bearer ${anon}`,
  }
}
