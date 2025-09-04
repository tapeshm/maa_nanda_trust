// Seed or update users in Supabase Auth using the Admin API.
// Reads config from .dev.vars via dotenv and an ADMIN_USERS array.
// NOTE: Passwords are provided explicitly per user in .dev.vars (no random generation).
// Example .env:
//   SUPABASE_URL=https://YOUR_PROJECT.supabase.co
//   SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY
//   ADMIN_USERS=[{"email":"admin@example.com","password":"abc123","roles":["admin"]},{"email":"trustee@example.com","password":"abc123","roles":["trustee"]}]

import dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'

// Load from .dev.vars (Wrangler-style env file)
dotenv.config({ path: '.dev.vars' })

const SUPABASE_URL = process.env.SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY
const USERS_JSON = process.env.ADMIN_USERS

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY/SUPABASE_SECRET_KEY in environment')
  process.exit(1)
}

let users
try {
  users = JSON.parse(USERS_JSON || '[]')
} catch (e) {
  console.error('ADMIN_USERS is not valid JSON:', e.message || e)
  process.exit(1)
}
if (!Array.isArray(users) || users.length === 0) {
  console.error('ADMIN_USERS must be a non-empty JSON array of users')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

function normEmail(s) {
  return String(s || '').trim().toLowerCase()
}

function toRoles(u) {
  const roles = new Set()
  if (Array.isArray(u.roles)) u.roles.forEach((r) => roles.add(String(r).toLowerCase()))
  if (u.role) roles.add(String(u.role).toLowerCase())
  const out = Array.from(roles)
  return out.length ? out : ['admin'] // default to admin if unspecified
}

async function findUserByEmail(email) {
  // Supabase Admin API lacks direct get-by-email; paginate a few pages.
  const perPage = 1000
  for (let page = 1; page <= 10; page++) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage })
    if (error) throw error
    const hit = data?.users?.find((u) => normEmail(u.email) === email)
    if (hit) return hit
    if (!data || !Array.isArray(data.users) || data.users.length < perPage) break
  }
  return null
}

async function upsertUser(u) {
  const email = normEmail(u.email || u.username)
  if (!email) throw new Error('User missing email')

  const app_metadata = {}
  const roles = toRoles(u)
  if (roles.length) app_metadata.roles = roles

  // Try to find existing user first (helps with clearer output)
  const existing = await findUserByEmail(email)

  if (!existing) {
    if (!u.password) throw new Error(`Missing password for new user ${email}. Provide password in ADMIN_USERS`)
    const payload = {
      email,
      email_confirm: true,
      app_metadata,
      password: u.password,
    }
    const { data, error } = await supabase.auth.admin.createUser(payload)
    if (error) throw error
    return { action: 'created', user: data.user }
  } else {
    const updatePayload = { app_metadata }
    if (u.password) updatePayload.password = u.password
    const { data, error } = await supabase.auth.admin.updateUserById(existing.id, updatePayload)
    if (error) throw error
    return { action: 'updated', user: data.user }
  }
}

async function main() {
  for (const u of users) {
    try {
      const res = await upsertUser(u)
      console.log(`${res.action}: ${res.user.email} (${res.user.id}) roles=${JSON.stringify(res.user.app_metadata?.roles || null)}`)
    } catch (e) {
      console.error(`Failed for ${u?.email || '<no email>'}:`, e?.message || e)
    }
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
