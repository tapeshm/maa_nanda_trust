/**
 * Shared auth types and Hono context augmentation.
 */
export type { AuthClaims } from '../auth/verify'

export type AuthContext = {
  token: string | null
  claims: import('../auth/verify').AuthClaims | null
  userId: string | null
}

declare module 'hono' {
  interface ContextVariableMap {
    // New unified auth context used by UI/routes
    auth?: import('./auth').AuthContext
  }
}
