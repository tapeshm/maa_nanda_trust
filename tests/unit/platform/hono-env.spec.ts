import { describe, it, expect } from 'vitest'
import { env } from 'cloudflare:test'
import app from '../../../src/index'

// Tests run directly against local simulators provided by wrangler dev/miniflare.

describe('bindings availability', () => {
  it('has D1 DB binding', () => {
    expect(env.DB).toBeDefined()
    expect(typeof env.DB.prepare).toBe('function')
  })

  it('has KV binding', () => {
    expect(env.KV).toBeDefined()
    expect(typeof env.KV.get).toBe('function')
    expect(typeof env.KV.put).toBe('function')
  })

  it('has R2 binding', () => {
    expect(env.R2).toBeDefined()
    expect(typeof env.R2.get).toBe('function')
    expect(typeof env.R2.put).toBe('function')
  })
})

describe('app + context', () => {
  it('responds with 200 and expected content', async () => {
    // Provide a minimal execution context to ensure it is accepted
    const ctx = { waitUntil: (_p: Promise<any>) => { } } as any
    const res = await app.fetch(new Request('http://localhost/'), env as any, ctx)
    expect(res.status).toBe(200)
    const html = await res.text()
    expect(html).toContain('Welcome to Temple Trust')
  })
})

describe('KV functionality', () => {
    it('can put and get a value', async () => {
      const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`
      const key = `test:kv:${suffix}`
      const value = `value-${suffix}`

      await env.KV.put(key, value, { expirationTtl: 60 })
      const got = await env.KV.get(key)
      expect(got).toBe(value)

      await env.KV.delete(key)
      const after = await env.KV.get(key)
      expect(after).toBeNull()
    })
  })

describe('R2 functionality', () => {
    it('can put and get an object', async () => {
      const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`
      const key = `tests/r2/${suffix}.txt`
      const content = `hello-${suffix}`

      await env.R2.put(key, content)
      const obj = await env.R2.get(key)
      expect(obj).not.toBeNull()
      const text = await obj!.text()
      expect(text).toBe(content)

      await env.R2.delete(key)
      const gone = await env.R2.get(key)
      expect(gone).toBeNull()
    })
  })

describe('D1 functionality', () => {
    it('can run a simple SELECT', async () => {
      const result = await env.DB.prepare('SELECT 1 as one').all<{ one: number }>()
      expect(result.results && result.results[0]?.one).toBe(1)
    })

    it('supports bound parameters', async () => {
      const n = 42
      const result = await env.DB.prepare('SELECT ? as v').bind(n).all<{ v: number }>()
      expect(result.results && result.results[0]?.v).toBe(n)
    })

    it('has content_blocks table from migrations', async () => {
      const res = await env.DB.prepare(
        "SELECT name FROM sqlite_master WHERE type='table' AND name=?",
      )
        .bind('content_blocks')
        .all<{ name: string }>()
      expect(res.results?.length).toBe(1)
      expect(res.results?.[0]?.name).toBe('content_blocks')
    })

    it('can insert and fetch a content_blocks row', async () => {
      const slug = `test-slug-${Date.now()}-${Math.random().toString(16).slice(2)}`
      const title = 'Test Title'
      const json = JSON.stringify({ blocks: [{ type: 'paragraph', data: { text: 'Hello' } }] })

      await env.DB.prepare(
        'INSERT INTO content_blocks (slug, title, json) VALUES (?, ?, ?)',
      )
        .bind(slug, title, json)
        .run()

      const out = await env.DB.prepare(
        'SELECT slug, title, json FROM content_blocks WHERE slug = ?',
      )
        .bind(slug)
        .all<{ slug: string; title: string; json: string }>()

      expect(out.results?.length).toBe(1)
      expect(out.results?.[0]?.slug).toBe(slug)
      expect(out.results?.[0]?.title).toBe(title)
      expect(() => JSON.parse(out.results![0]!.json)).not.toThrow()
    })
  })
