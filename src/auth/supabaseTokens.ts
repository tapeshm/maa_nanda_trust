// [D3:auth.step-04:tokens]
import type { Context } from 'hono'
import { buildAuthHeaders, getSupabaseUrl } from '../config/supabase'
import { readEnv } from '../utils/env'

type EnvLike = unknown

export type TokenPair = {
  access_token: string
  refresh_token: string
}

export class SupabaseAuthError extends Error {
  status: number
  code?: string
  retryable: boolean
  category?: 'invalid_grant_already_used' | 'invalid_or_revoked_family' | 'invalid_grant' | 'other'
  constructor(message: string, opts: { status: number; code?: string; retryable?: boolean; category?: SupabaseAuthError['category'] }) {
    super(message)
    this.name = 'SupabaseAuthError'
    this.status = opts.status
    this.code = opts.code
    this.retryable = !!opts.retryable
    this.category = opts.category
  }
}

// unified env reader via utils

function classifyError(status: number, body: any): SupabaseAuthError {
  const code = (body?.error as string) || (body?.code as string) || undefined
  const desc = (body?.error_description as string) || (body?.msg as string) || (body?.message as string) || ''

  // 5xx → retryable operational error
  if (status >= 500) {
    return new SupabaseAuthError(desc || `Supabase ${status}`, {
      status,
      code,
      retryable: true,
      category: 'other',
    })
  }

  // 4xx mappings for refresh/login flows
  if (code === 'invalid_grant') {
    const lowered = desc.toLowerCase()
    if (lowered.includes('used')) {
      return new SupabaseAuthError(desc || 'invalid_grant already used', {
        status,
        code,
        retryable: false,
        category: 'invalid_grant_already_used',
      })
    }
    if (lowered.includes('revoked') || lowered.includes('invalid refresh token') || lowered.includes('invalid_token')) {
      return new SupabaseAuthError(desc || 'invalid/revoked token family', {
        status,
        code,
        retryable: false,
        category: 'invalid_or_revoked_family',
      })
    }
    return new SupabaseAuthError(desc || 'invalid_grant', {
      status,
      code,
      retryable: false,
      category: 'invalid_grant',
    })
  }

  return new SupabaseAuthError(desc || `Supabase ${status}`, { status, code, retryable: false, category: 'other' })
}

function buildTokenUrl(envOrCtx: Context | EnvLike, grant: 'password' | 'refresh_token'): string {
  const base = getSupabaseUrl(envOrCtx)
  return `${base}/auth/v1/token?grant_type=${grant}`
}

async function supabaseTokenRequest(envOrCtx: Context | EnvLike, url: string, bodyObj: Record<string, string>): Promise<TokenPair> {
  const headers: HeadersInit = {
    ...buildAuthHeaders(envOrCtx),
    'Content-Type': 'application/json',
  }
  const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(bodyObj) })
  const json: any = await res.json().catch(() => ({} as any))
  if (!res.ok) {
    throw classifyError(res.status, json)
  }
  const access_token = json?.access_token
  const refresh_token = json?.refresh_token
  if (!access_token || !refresh_token) {
    throw new SupabaseAuthError('Missing tokens in response', { status: res.status, code: json?.error, retryable: false, category: 'other' })
  }
  return { access_token, refresh_token }
}

export type LoginCredentials = { email: string; password: string }

export async function exchangeLogin(envOrCtx: Context | EnvLike, credentials: LoginCredentials): Promise<TokenPair> {
  const url = buildTokenUrl(envOrCtx, 'password')
  return supabaseTokenRequest(envOrCtx, url, { email: credentials.email, password: credentials.password })
}

export async function refreshAccess(envOrCtx: Context | EnvLike, refresh_token: string): Promise<TokenPair> {
  const url = buildTokenUrl(envOrCtx, 'refresh_token')
  return supabaseTokenRequest(envOrCtx, url, { refresh_token })
}
