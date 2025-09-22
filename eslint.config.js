import { FlatCompat } from '@eslint/eslintrc'
import js from '@eslint/js'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

// [D3:editor-tiptap.step-01:eslint] Bridge legacy .eslintrc config to ESLint v9 flat config.
const compat = new FlatCompat({
  baseDirectory: path.dirname(fileURLToPath(import.meta.url)),
  recommendedConfig: js.configs.recommended,
  allConfig: js.configs.all,
})

export default compat.config(
  {
    extends: ['./.eslintrc.cjs'],
  },
)
