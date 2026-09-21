/**
 * Inline theme initialization script to execute synchronously in <head>
 * before React hydration, preventing Flash of Unstyled Content (FOUC).
 */
export const themeInitScript = `
(function() {
  try {
    var stored = localStorage.getItem('erp_theme');
    var isDark = false;
    if (stored === 'dark') {
      isDark = true;
    } else if (stored === 'light') {
      isDark = false;
    } else {
      isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    if (isDark) {
      document.documentElement.classList.add('dark');
      document.documentElement.style.colorScheme = 'dark';
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.style.colorScheme = 'light';
    }
  } catch (e) {}
})();
`;
