/** @jsxImportSource hono/jsx */
import type { FC } from 'hono/jsx'
import Layout from '../layout'
import { resolveAsset } from '../../utils/assets'

type EditorSpec = {
  id: string
  profile?: 'basic' | 'full'
}

type JSONContent = {
  type: 'doc'
  content?: any[]
}

// [D3:editor-tiptap.step-04:editor-template] Admin editor page template with SSR JSON payloads.
const EditorPage: FC<{
  title: string
  csrfToken: string
  editors: EditorSpec[]
  initialPayloads?: Record<string, JSONContent>
  nonce?: string
}> = ({ title, csrfToken, editors, initialPayloads = {}, nonce }) => {
  const asset = resolveAsset('editor')

  const head = (
    <>
      {asset.styles.map((href) => (
        <link rel="stylesheet" href={href} key={href} />
      ))}
      <script src={asset.script} type="module" defer></script>
    </>
  )

  return (
    <Layout title={title} signedIn={true} csrfToken={csrfToken} extraHead={head}>
      <main class="mx-auto max-w-5xl px-4 py-8">
        <h1 class="text-2xl font-semibold mb-4">{title}</h1>

        {editors.map(({ id, profile = 'basic' }) => {
          const payload = initialPayloads[id] ?? { type: 'doc', content: [] }
          const scriptId = `${id}__content`
          return (
            <section class="mb-8" id={`${id}__section`}>
              <div id={id} data-editor data-editor-profile={profile} />
              <script id={scriptId} type="application/json" nonce={nonce}>
                {JSON.stringify(payload)}
              </script>
            </section>
          )
        })}
      </main>
    </Layout>
  )
}

export default EditorPage
