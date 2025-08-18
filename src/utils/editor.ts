/**
 * Escape HTML special characters to prevent injection attacks.  This helper
 * converts characters like `<`, `>`, `&` and `"` into their HTML entity
 * equivalents.  It should be used whenever untrusted user input is inserted
 * into the DOM【212270213774445†L210-L222】.
 */
export function escapeHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/**
 * Convert an Editor.js block array into a plain HTML string.  This function
 * implements a subset of block types (header, paragraph, list, image, quote,
 * code) commonly used in Editor.js.  Unknown block types are ignored to
 * prevent rendering unexpected content.  All textual content is escaped via
 * `escapeHtml()` to mitigate XSS.  Images and lists receive simple Tailwind
 * classes for spacing.
 *
 * @param blocks Editor.js `blocks` array parsed from stored JSON
 * @returns HTML string ready for insertion into the DOM
 */
export function renderEditorJS(blocks: Array<any>): string {
  return blocks
    .map((block) => {
      switch (block.type) {
        case 'header': {
          const level = block.data.level || 2
          const text = escapeHtml(block.data.text || '')
          return `<h${level} class="mt-4 mb-2 font-bold text-${level + 2}xl">${text}</h${level}>`
        }
        case 'paragraph': {
          const text = escapeHtml(block.data.text || '')
          return `<p class="my-2">${text}</p>`
        }
        case 'list': {
          const tag = block.data.style === 'ordered' ? 'ol' : 'ul'
          const items = (block.data.items || [])
            .map((item: string) => `<li>${escapeHtml(item)}</li>`) 
            .join('')
          return `<${tag} class="my-2 list-disc list-inside">${items}</${tag}>`
        }
        case 'quote': {
          const text = escapeHtml(block.data.text || '')
          const caption = escapeHtml(block.data.caption || '')
          return `<blockquote class="border-l-4 pl-4 italic my-2">${text}<cite class="block text-sm mt-1">${caption}</cite></blockquote>`
        }
        case 'code': {
          const code = escapeHtml(block.data.code || '')
          return `<pre class="bg-gray-100 p-2 rounded my-2"><code>${code}</code></pre>`
        }
        case 'image': {
          // Editor.js image tool typically stores the URL under data.file.url
          const src = escapeHtml(block.data.file?.url || '')
          const caption = escapeHtml(block.data.caption || '')
          return `<figure class="my-4"><img src="${src}" alt="${caption}" class="max-w-full h-auto mx-auto"/><figcaption class="text-center text-sm mt-1 text-gray-600">${caption}</figcaption></figure>`
        }
        default:
          return ''
      }
    })
    .join('')
}