import { describe, it, expect } from 'vitest'
import { env } from 'cloudflare:test'

async function hasSqliteObject(type: 'table' | 'index', name: string) {
  const res = await env.DB.prepare(
    "SELECT name FROM sqlite_master WHERE type = ? AND name = ?",
  )
    .bind(type, name)
    .all<{ name: string }>()
  return (res.results?.length ?? 0) > 0
}

describe('D1 schema (after migrations)', () => {
  it('creates core tables', async () => {
    expect(await hasSqliteObject('table', 'content_blocks')).toBe(true)
    expect(await hasSqliteObject('table', 'media')).toBe(true)
    expect(await hasSqliteObject('table', 'admin_users')).toBe(true)
    expect(await hasSqliteObject('table', 'finance')).toBe(true)
  })

  it('creates finance date index', async () => {
    expect(await hasSqliteObject('index', 'idx_finance_date')).toBe(true)
  })

  describe('content_blocks columns', () => {
    it('matches expected columns and types', async () => {
      const res = await env.DB.prepare("PRAGMA table_info('content_blocks')").all<{
        cid: number
        name: string
        type: string
        notnull: number
        dflt_value: string | null
        pk: number
      }>()

      const cols = (res.results ?? []).map((r) => ({
        name: r.name,
        type: r.type,
        notnull: r.notnull,
        dflt: r.dflt_value,
        pk: r.pk,
      }))

      // Expected order from migration 0001_content_blocks.sql
      expect(cols).toStrictEqual([
        { name: 'id', type: 'INTEGER', notnull: 0, dflt: null, pk: 1 },
        { name: 'slug', type: 'TEXT', notnull: 1, dflt: null, pk: 0 },
        { name: 'title', type: 'TEXT', notnull: 1, dflt: null, pk: 0 },
        { name: 'json', type: 'TEXT', notnull: 1, dflt: null, pk: 0 },
        {
          name: 'created_at',
          type: 'TIMESTAMP',
          notnull: 1,
          dflt: 'CURRENT_TIMESTAMP',
          pk: 0,
        },
        {
          name: 'updated_at',
          type: 'TIMESTAMP',
          notnull: 1,
          dflt: 'CURRENT_TIMESTAMP',
          pk: 0,
        },
      ])
    })
  })

  describe('media columns', () => {
    it('matches expected columns and types', async () => {
      const res = await env.DB.prepare("PRAGMA table_info('media')").all<{
        cid: number
        name: string
        type: string
        notnull: number
        dflt_value: string | null
        pk: number
      }>()

      const cols = (res.results ?? []).map((r) => ({
        name: r.name,
        type: r.type,
        notnull: r.notnull,
        dflt: r.dflt_value,
        pk: r.pk,
      }))

      expect(cols).toStrictEqual([
        { name: 'id', type: 'INTEGER', notnull: 0, dflt: null, pk: 1 },
        { name: 'key', type: 'TEXT', notnull: 1, dflt: null, pk: 0 },
        { name: 'filename', type: 'TEXT', notnull: 1, dflt: null, pk: 0 },
        { name: 'mimetype', type: 'TEXT', notnull: 1, dflt: null, pk: 0 },
        { name: 'size', type: 'INTEGER', notnull: 1, dflt: null, pk: 0 },
        { name: 'url', type: 'TEXT', notnull: 0, dflt: null, pk: 0 },
        {
          name: 'uploaded_at',
          type: 'TIMESTAMP',
          notnull: 1,
          dflt: 'CURRENT_TIMESTAMP',
          pk: 0,
        },
      ])
    })
  })

  describe('admin_users columns', () => {
    it('matches expected columns and types', async () => {
      const res = await env.DB.prepare("PRAGMA table_info('admin_users')").all<{
        cid: number
        name: string
        type: string
        notnull: number
        dflt_value: string | null
        pk: number
      }>()

      const cols = (res.results ?? []).map((r) => ({
        name: r.name,
        type: r.type,
        notnull: r.notnull,
        dflt: r.dflt_value,
        pk: r.pk,
      }))

      expect(cols).toStrictEqual([
        { name: 'id', type: 'INTEGER', notnull: 0, dflt: null, pk: 1 },
        { name: 'username', type: 'TEXT', notnull: 1, dflt: null, pk: 0 },
        { name: 'password_hash', type: 'TEXT', notnull: 1, dflt: null, pk: 0 },
        { name: 'role', type: 'TEXT', notnull: 1, dflt: "'admin'", pk: 0 },
        {
          name: 'created_at',
          type: 'TIMESTAMP',
          notnull: 1,
          dflt: 'CURRENT_TIMESTAMP',
          pk: 0,
        },
      ])
    })
  })

  describe('finance columns', () => {
    it('matches expected columns and types', async () => {
      const res = await env.DB.prepare("PRAGMA table_info('finance')").all<{
        cid: number
        name: string
        type: string
        notnull: number
        dflt_value: string | null
        pk: number
      }>()

      const cols = (res.results ?? []).map((r) => ({
        name: r.name,
        type: r.type,
        notnull: r.notnull,
        dflt: r.dflt_value,
        pk: r.pk,
      }))

      expect(cols).toStrictEqual([
        { name: 'id', type: 'INTEGER', notnull: 0, dflt: null, pk: 1 },
        { name: 'activity', type: 'TEXT', notnull: 1, dflt: null, pk: 0 },
        { name: 'date', type: 'TEXT', notnull: 1, dflt: null, pk: 0 },
        { name: 'type', type: 'TEXT', notnull: 1, dflt: null, pk: 0 },
        { name: 'amount', type: 'REAL', notnull: 1, dflt: null, pk: 0 },
        { name: 'contact', type: 'TEXT', notnull: 0, dflt: null, pk: 0 },
        { name: 'notes', type: 'TEXT', notnull: 0, dflt: null, pk: 0 },
        {
          name: 'created_at',
          type: 'TIMESTAMP',
          notnull: 1,
          dflt: 'CURRENT_TIMESTAMP',
          pk: 0,
        },
      ])
    })
  })
})
