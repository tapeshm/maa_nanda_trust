import manifestJson from '../../dist/client/.vite/manifest.json' assert { type: 'json' }

// [D3:editor-tiptap.step-01:assets-manifest] Resolve file paths from the Vite manifest for server rendering.
type ManifestEntry = {
  file: string
  css?: string[]
  name?: string
}

export type ManifestMap = Record<string, ManifestEntry>

const manifest: ManifestMap = manifestJson as ManifestMap

function lookupEntry(source: ManifestMap, entry: string): ManifestEntry | undefined {
  return source[entry] ?? Object.values(source).find((candidate) => candidate.name === entry)
}

function normalizePath(path: string): string {
  return path.startsWith('/') ? path : `/${path}`
}

export interface ResolvedAsset {
  script: string
  styles: string[]
}

// [D3:editor-tiptap.step-01:resolve] Lookup the manifest entry for the requested bundle.
export function resolveAssetFromManifest(source: ManifestMap, entry: string): ResolvedAsset {
  const record = lookupEntry(source, entry)

  if (!record || !record.file) {
    throw new Error(
      `Asset entry "${entry}" not found in manifest. Run 'pnpm run build:client' before building the worker.`,
    )
  }

  const styles = (record.css ?? []).map(normalizePath)
  const script = normalizePath(record.file)

  return { script, styles }
}

export function hasAssetInManifest(source: ManifestMap, entry: string): boolean {
  return Boolean(lookupEntry(source, entry))
}

export function resolveAsset(entry: string): ResolvedAsset {
  return resolveAssetFromManifest(manifest, entry)
}

export function hasAsset(entry: string): boolean {
  return hasAssetInManifest(manifest, entry)
}
