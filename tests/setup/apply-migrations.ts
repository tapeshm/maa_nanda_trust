import { env, applyD1Migrations } from 'cloudflare:test'

// Apply D1 migrations (if any) before tests run.
// `TEST_MIGRATIONS` is injected via vitest.config.ts using Miniflare bindings.
const migrations = (env as any).TEST_MIGRATIONS ?? []

if (migrations.length > 0) {
  await applyD1Migrations(env.DB, migrations)
}

