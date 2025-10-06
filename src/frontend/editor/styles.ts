// Centralized Tailwind class lists for the editor UI
// Keep all editor-related styling here for consistent look-and-feel.

// [D3:editor-tiptap.step-11:import-content-class] Import single source of truth for content classes
import { contentClass } from './ui/content'

const EDITOR_CHROME_TOKENS = [
  'border',
  'border-gray-200',
  'dark:border-gray-700',
  'rounded-lg',
  'p-3',
  'sm:p-3',
  'lg:p-4',
  'xl:p-5',
  'focus:outline-none',
  'focus:ring-2',
  'focus:ring-blue-300',
  'focus:ring-opacity-90',
  'tiptap-editor',
]

// [D3:editor-tiptap.step-11:export-content-class] Re-export contentClass for consistency
export { contentClass }

// [D3:editor-tiptap.step-03:prose-base] Shared typography tokens for editor + SSR output.
// [D3:editor-tiptap.step-11:use-content-class] Use contentClass() as base for prose
export const PROSE_BASE = contentClass()

// [D3:editor-tiptap.step-08:editor-chrome] Container chrome applied only within the editor UI.
export const EDITOR_CHROME = EDITOR_CHROME_TOKENS.join(' ')

// [D3:editor-tiptap.step-08:public-prose] Public pages reuse the same typography for parity.
export const PUBLIC_CONTENT_WRAPPER_CLASSNAME = PROSE_BASE

// [D3:editor-tiptap.step-03:editor-classes] Tailwind classes applied via Tiptap editorProps.
export const EDITOR_CLASSNAME = [PROSE_BASE, EDITOR_CHROME].join(' ')

// Menu bar (optional UI rendered by host components)
export const MENUBAR_CLASSNAME = [
  'flex', // Flexbox layout
  'items-center', // Center items vertically
  'gap-1', // Small gap between items
  'p-2', // Padding of 0.5rem
  'border', // Adds a border
  'border-gray-200', // Light gray border
  'dark:border-gray-700', // Dark gray border for dark mode
  'rounded-md', // Medium rounded corners
  'bg-white', // White background
  'dark:bg-zinc-900', // Zinc-900 background for dark mode
].join(' ')

export const MENUBAR_BUTTON_CLASSNAME = [
  'inline-flex', // Inline flexbox
  'items-center', // Center items vertically
  'gap-1', // Small gap between items
  'text-sm', // Small text size
  'px-2', // Horizontal padding of 0.5rem
  'py-1', // Vertical padding of 0.25rem
  'rounded', // Rounded corners
  'text-zinc-700', // Zinc-700 text color
  'dark:text-zinc-200', // Zinc-200 text for dark mode
  'hover:bg-zinc-100', // Light zinc background on hover
  'dark:hover:bg-zinc-800', // Dark zinc background on hover for dark mode
].join(' ')

export const MENUBAR_BUTTON_ACTIVE_CLASSNAME = [
  'bg-zinc-200', // Zinc-200 background for active state
  'dark:bg-zinc-700', // Zinc-700 background for active in dark mode
].join(' ')
