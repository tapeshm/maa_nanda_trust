// Centralized Tailwind class lists for the editor UI
// Keep all editor-related styling here for consistent look-and-feel.

// [D3:editor-tiptap.step-11:import-content-class] Import single source of truth for content classes
import { contentClass } from './ui/content'

function tokenizeClassNames(value: string): string[] {
  return value.split(/\s+/).filter(Boolean)
}

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
  'ring-1 ring-zinc-300',
].join(' ')

export const MENUBAR_BUTTON_ACTIVE_TOKENS = tokenizeClassNames(MENUBAR_BUTTON_ACTIVE_CLASSNAME)

// [D3:editor-tiptap.step-14:image-panel-styles] Styles for contextual image controls
export const IMAGE_PANEL_CLASSNAME = [
  'mt-2',
  'p-3',
  'border',
  'border-gray-200',
  'dark:border-gray-700',
  'rounded-md',
  'bg-gray-50',
  'dark:bg-zinc-800',
  'space-y-3',
].join(' ')

export const IMAGE_PANEL_SECTION_CLASSNAME = ['space-y-1'].join(' ')

export const IMAGE_PANEL_LABEL_CLASSNAME = [
  'block',
  'text-xs',
  'font-semibold',
  'uppercase',
  'tracking-wide',
  'text-zinc-500',
  'dark:text-zinc-400',
].join(' ')

export const IMAGE_PANEL_BUTTONS_CLASSNAME = ['flex', 'gap-1', 'flex-wrap'].join(' ')

export const IMAGE_PANEL_BUTTON_CLASSNAME = [
  'inline-flex',
  'items-center',
  'justify-center',
  'px-3',
  'py-1.5',
  'text-sm',
  'rounded',
  'border',
  'border-gray-300',
  'dark:border-gray-600',
  'bg-white',
  'dark:bg-zinc-900',
  'text-zinc-700',
  'dark:text-zinc-200',
  'hover:bg-zinc-100',
  'dark:hover:bg-zinc-800',
  'transition-colors',
].join(' ')

// export const IMAGE_PANEL_BUTTON_ACTIVE_CLASSNAME = [
//   'bg-blue-100',
//   'dark:bg-blue-900',
//   'border-blue-500',
//   'dark:border-blue-400',
//   'text-blue-700',
//   'dark:text-blue-200',
// ].join(' ')

export const IMAGE_PANEL_BUTTON_ACTIVE_CLASSNAME = MENUBAR_BUTTON_ACTIVE_CLASSNAME

export const IMAGE_PANEL_BUTTON_ACTIVE_TOKENS = tokenizeClassNames(
  IMAGE_PANEL_BUTTON_ACTIVE_CLASSNAME,
)

export const IMAGE_PANEL_INPUT_CLASSNAME = [
  'block',
  'w-full',
  'rounded-md',
  'border',
  'border-gray-300',
  'dark:border-gray-600',
  'px-3',
  'py-2',
  'text-sm',
  'bg-white',
  'dark:bg-zinc-900',
  'text-zinc-900',
  'dark:text-zinc-100',
  'placeholder-zinc-400',
  'dark:placeholder-zinc-500',
  'focus:border-blue-500',
  'focus:outline-none',
  'focus:ring-2',
  'focus:ring-blue-500',
  'focus:ring-opacity-50',
].join(' ')
