/**
 * Dark Mode Toggle Implementation
 * Handles theme switching with localStorage persistence and system preference detection
 * Compatible with Tailwind CSS dark mode classes
 */

(function () {
  'use strict';

  const THEME_KEY = 'theme';
  const THEME_ATTRIBUTE = 'data-theme';
  const THEMES = {
    LIGHT: 'light',
    DARK: 'dark'
  };

  /**
   * Initialize theme on page load
   * Preference order: localStorage -> system preference -> light (default)
   */
  function initializeTheme() {
    let theme = THEMES.LIGHT; // Default fallback

    try {
      // Check localStorage first (highest priority)
      const savedTheme = localStorage.getItem(THEME_KEY);
      if (savedTheme && Object.values(THEMES).includes(savedTheme)) {
        theme = savedTheme;
      }
      // Then check system preference if no saved theme
      else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        theme = THEMES.DARK;
      }
    } catch (error) {
      console.warn('Theme initialization error:', error);
      // Fallback to light mode if localStorage unavailable
    }

    applyTheme(theme);
    return theme;
  }

  /**
   * Apply theme to document and update Tailwind dark mode
   */
  function applyTheme(theme) {
    const html = document.documentElement;

    // Set data attribute for consistency
    html.setAttribute(THEME_ATTRIBUTE, theme);

    // Add/remove dark class for Tailwind CSS
    if (theme === THEMES.DARK) {
      html.classList.add('dark');
    } else {
      html.classList.remove('dark');
    }
  }

  /**
   * Toggle between light and dark themes
   */
  function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute(THEME_ATTRIBUTE) || THEMES.LIGHT;
    const newTheme = currentTheme === THEMES.DARK ? THEMES.LIGHT : THEMES.DARK;

    applyTheme(newTheme);

    // Persist preference
    try {
      localStorage.setItem(THEME_KEY, newTheme);
    } catch (error) {
      console.warn('Unable to save theme preference:', error);
    }

    // Dispatch custom event for other components that might need to react
    window.dispatchEvent(new CustomEvent('themeChanged', {
      detail: { theme: newTheme, previousTheme: currentTheme }
    }));

    return newTheme;
  }

  /**
   * Get current theme
   */
  function getCurrentTheme() {
    return document.documentElement.getAttribute(THEME_ATTRIBUTE) || THEMES.LIGHT;
  }

  /**
   * Set up event listeners when DOM is ready
   */
  function setupEventListeners() {
    // Handle theme toggle buttons
    document.addEventListener('click', function (event) {
      const toggleButton = event.target.closest('[data-theme-toggle]');
      if (toggleButton) {
        event.preventDefault();
        toggleTheme();
      }
    });

    // Listen for system theme changes
    if (window.matchMedia) {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

      // Only update if user hasn't set a preference
      mediaQuery.addEventListener('change', function (e) {
        if (!localStorage.getItem(THEME_KEY)) {
          const newTheme = e.matches ? THEMES.DARK : THEMES.LIGHT;
          applyTheme(newTheme);
        }
      });
    }
  }

  // Initialize theme immediately to prevent FOUC
  const initialTheme = initializeTheme();

  // Set up event listeners when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupEventListeners);
  } else {
    setupEventListeners();
  }

  // Expose API for programmatic access
  window.ThemeToggle = {
    toggle: toggleTheme,
    get: getCurrentTheme,
    set: applyTheme,
    THEMES: THEMES
  };

})();
