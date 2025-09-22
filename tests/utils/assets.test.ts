import { describe, it, expect } from 'vitest'

type ManifestMap = Record<
  string,
  {
    file: string
    css?: string[]
    name?: string
  }
>

const mockManifest: ManifestMap = {
  'src/frontend/editor/index.ts': {
    name: 'editor',
    file: 'assets/editor-123.js',
    css: ['assets/editor-123.css'],
  },
  'src/frontend/ui.ts': {
    name: 'ui',
    file: 'assets/ui-123.js',
  },
}

describe('asset manifest resolver', () => {
  it('resolves editor entry JS from manifest', async () => {
    const { resolveAssetFromManifest } = await import('../../src/utils/assets')
    const asset = resolveAssetFromManifest(mockManifest, 'editor')
    expect(asset.script).toBe('/assets/editor-123.js')
  })

  it('returns CSS entries when present', async () => {
    const { resolveAssetFromManifest } = await import('../../src/utils/assets')
    const asset = resolveAssetFromManifest(mockManifest, 'editor')
    expect(asset.styles).toEqual(['/assets/editor-123.css'])
  })

  it('resolves entries by source path', async () => {
    const { resolveAssetFromManifest } = await import('../../src/utils/assets')
    const asset = resolveAssetFromManifest(mockManifest, 'src/frontend/ui.ts')
    expect(asset.script).toBe('/assets/ui-123.js')
  })

  it('throws a helpful error when entry missing', async () => {
    const { resolveAssetFromManifest } = await import('../../src/utils/assets')
    expect(() => resolveAssetFromManifest(mockManifest, 'missing')).toThrow(/missing/i)
  })

  it('exposes presence checks for entries', async () => {
    const { hasAssetInManifest } = await import('../../src/utils/assets')
    expect(hasAssetInManifest(mockManifest, 'ui')).toBe(true)
    expect(hasAssetInManifest(mockManifest, 'src/frontend/editor/index.ts')).toBe(true)
    expect(hasAssetInManifest(mockManifest, 'missing')).toBe(false)
  })

  it('resolves editor entry via static manifest import (dev & prod parity)', async () => {
    const manifestModule = (await import('../../dist/client/.vite/manifest.json', {
      assert: { type: 'json' },
    })) as { default: ManifestMap }

    const { resolveAsset, resolveAssetFromManifest } = await import('../../src/utils/assets')
    const direct = resolveAsset('editor')
    const manual = resolveAssetFromManifest(manifestModule.default, 'editor')

    expect(direct).toEqual(manual)
  })
})
