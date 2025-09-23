// Centralized Tailwind class lists for the editor UI
// Keep all editor-related styling here for consistent look-and-feel.

// Container + typography + chrome
export const EDITOR_CLASSNAME = [
  // Typography (Tailwind Typography plugin)
  'prose', // Enables base typography styles for content
  'prose-sm', // Small prose size for mobile
  'sm:prose-base', // Base prose size from small screens up
  'lg:prose-lg', // Large prose size from large screens up
  'xl:prose-2xl', // Extra-large prose size from extra-large screens up
  'prose-zinc', // Zinc color scheme for prose elements
  'dark:prose-invert', // Inverts prose colors for dark mode

  // Container chrome
  'border', // Adds a border around the editor
  'border-gray-200', // Light gray border color
  'dark:border-gray-700', // Dark gray border for dark mode
  'rounded-lg', // Large rounded corners
  'p-3', // Base padding of 0.75rem
  'sm:p-3', // Same padding on small screens (redundant, but explicit)
  'lg:p-4', // Increased padding to 1rem on large screens
  'xl:p-5', // Further increased padding to 1.25rem on extra-large screens
  'm-5', // Negative margin of -1.25rem (likely for layout adjustment)
  'focus:ring-2', // Focus ring with 2px width
  'focus:ring-blue-300', // Blue focus ring color
  'focus:ring-opacity-90', // 90% opacity for focus ring

  // Hook for targeting via CSS if ever needed
  'tiptap-editor', // Custom class for additional CSS targeting
].join(' ')

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
