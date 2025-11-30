/**
 * Defines the supported languages for localization.
 */
export type Language = 'en' | 'hi';

/**
 * An array of all supported languages.
 */
export const LANGUAGES: Language[] = ['en', 'hi'];

/**
 * The default language to use when a specific translation is not available or specified.
 */
export const DEFAULT_LANGUAGE: Language = 'en';

/**
 * Represents a localized object with properties for each supported language.
 * @template T The type of the value being localized (e.g., string, number).
 */
export interface Localized<T> {
  en: T;
  hi: T;
}

/**
 * Type guard to check if a given value is a Localized object.
 * @template T The expected type of the localized values.
 * @param {any} value The value to check.
 * @returns {value is Localized<T>} True if the value is a Localized object, false otherwise.
 */
export function isLocalized<T>(value: any): value is Localized<T> {
  return (
    typeof value === 'object' &&
    value !== null &&
    'en' in value &&
    'hi' in value
  );
}

/**
 * Parses a string value that might be a JSON-encoded Localized object or a plain string.
 * It attempts to parse the value as JSON, and if it's a Localized object, it returns
 * the translation for the specified language. If the translation for the specific language
 * is not found, it falls back to the default language.
 * If the value is not valid JSON or not a Localized object, it treats the entire value
 * as a legacy plain string (assumed to be English).
 *
 * @param {string | null | undefined} value The string to parse, which can be a JSON string representing a Localized<string> or a plain string.
 * @param {Language} [lang=DEFAULT_LANGUAGE] The target language for the translation. Defaults to 'en'.
 * @returns {string} The translated string, the legacy plain string, or an empty string if the input is null/undefined.
 */
export function parseLocalized(value: string | null | undefined, lang: Language = DEFAULT_LANGUAGE): string {
  if (!value) return '';
  
  try {
    // Try to parse as JSON
    const parsed = JSON.parse(value);
    if (isLocalized<string>(parsed)) {
      return parsed[lang] || parsed[DEFAULT_LANGUAGE] || '';
    }
    // If it's JSON but not our Localized shape, return the original value,
    // assuming it's a legacy plain string that was somehow JSON parsed but not structured as expected.
    return value;
  } catch (e) {
    // Not valid JSON, treat as legacy plain string (English).
    // This string will be returned regardless of the requested 'lang',
    // adhering to the plan of falling back to English if a translation is missing.
    return value;
  }
}

/**
 * Parses a string value that might be a JSON-encoded Localized object or a plain string
 * and returns a `Localized<string>` object containing both English and Hindi versions.
 * This is particularly useful for administrative interfaces where all language versions are needed.
 * If the input is a plain string, it assumes it's the English content and provides an empty string for Hindi.
 *
 * @param {string | null | undefined} value The string to parse.
 * @returns {Localized<string>} A Localized object containing English and Hindi strings. Defaults to empty strings if input is null/undefined.
 */
export function parseLocalizedRaw(value: string | null | undefined): Localized<string> {
  if (!value) return { en: '', hi: '' };
  
  try {
    const parsed = JSON.parse(value);
    if (isLocalized<string>(parsed)) {
      return parsed;
    }
    // If not localized JSON, assume it's English legacy
    return { en: value, hi: '' };
  } catch {
    // Not valid JSON, assume it's English legacy
    return { en: value, hi: '' };
  }
}

/**
 * Serializes English and Hindi strings into a JSON string representing a Localized object.
 *
 * @param {string} en The English string.
 * @param {string} hi The Hindi string.
 * @returns {string} A JSON string representation of the Localized object.
 */
export function serializeLocalized(en: string, hi: string): string {
  return JSON.stringify({ en, hi });
}

/**
 * Resolves a value that might be a Localized object or a plain string to its translated string.
 * If the value is a Localized object, it returns the translation for the specified language,
 * falling back to the default language if the specific translation is missing.
 * If the value is a plain string, it returns the string itself.
 *
 * @param {any} value The value to resolve, can be Localized<string> or string.
 * @param {Language} [lang=DEFAULT_LANGUAGE] The target language. Defaults to 'en'.
 * @returns {string} The resolved translated string, the plain string, or an empty string if not resolvable.
 */
export function resolveLocalizedObject(value: any, lang: Language = DEFAULT_LANGUAGE): string {
  if (isLocalized<string>(value)) {
    return value[lang] || value[DEFAULT_LANGUAGE] || '';
  }
  if (typeof value === 'string') return value;
  return '';
}

/**
 * Resolves a value that might be a Localized object or a plain string into a `Localized<string>` object.
 * If the value is a Localized object, it returns it directly.
 * If the value is a plain string, it assumes it's the English content and provides an empty string for Hindi.
 *
 * @param {any} value The value to resolve, can be Localized<string> or string.
 * @returns {Localized<string>} A Localized object containing English and Hindi strings. Defaults to empty strings if not resolvable.
 */
export function resolveLocalizedObjectRaw(value: any): Localized<string> {
    if (isLocalized<string>(value)) {
        return value;
    }
    if (typeof value === 'string') {
        return { en: value, hi: '' };
    }
    return { en: '', hi: '' };
}

/**
 * Generates a localized URL path based on the target language.
 * 
 * @param {string} path The internal path (e.g., '/about', '/donate').
 * @param {Language} lang The target language.
 * @returns {string} The localized path.
 */
export function getLocalizedHref(path: string, lang: Language): string {
  if (lang === 'en') return path;
  if (path === '/') return '/hi';
  // Ensure path starts with / if it doesn't (though it usually should)
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `/hi${normalizedPath}`;
}

/**
 * Generates the label and URL for the language toggle button.
 * 
 * @param {Language} currentLang The current active language.
 * @param {string} currentPath The current path (e.g., '/about', '/hi/about').
 * @returns {{ label: string, href: string }} An object containing the toggle label and the target URL.
 */
export function getLanguageToggle(currentLang: Language, currentPath: string): { label: string, href: string } {
  if (currentLang === 'en') {
    return {
      label: 'हिंदी',
      href: getLocalizedHref(currentPath, 'hi')
    };
  } else {
    // Switch to English: Remove /hi prefix
    // We use a regex to match /hi followed by end of string or another slash
    const href = currentPath.replace(/^\/hi(\/|$)/, '/');
    // If replace results in empty string (e.g. /hi -> /), correct.
    // If /hi/about -> /about.
    // If just /hi -> / due to regex.
    return {
      label: 'English',
      href: href || '/'
    };
  }
}
