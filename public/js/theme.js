/**
 * Connect — Theme System
 * Manages light/dark/system theme with localStorage persistence.
 * Prevents FOUC by applying theme before DOM renders.
 */
(function () {
  const STORAGE_KEY = 'connect-theme';
  const themes = ['light', 'dark', 'system'];

  function getSystemTheme() {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  function getEffectiveTheme(stored) {
    if (stored === 'system' || !stored) return getSystemTheme();
    return stored;
  }

  function applyTheme(theme) {
    const effective = getEffectiveTheme(theme);
    document.documentElement.setAttribute('data-theme', effective);
    document.documentElement.classList.remove('light', 'dark');
    document.documentElement.classList.add(effective);
    updateToggleUI(theme || 'system', effective);
  }

  function updateToggleUI(stored, effective) {
    const btns = document.querySelectorAll('[data-theme-btn]');
    btns.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.themeBtn === stored);
    });

    const toggleIcon = document.getElementById('theme-icon');
    if (toggleIcon) {
      toggleIcon.textContent = effective === 'dark' ? '🌙' : '☀️';
    }

    const toggleLabel = document.getElementById('theme-label');
    if (toggleLabel) {
      toggleLabel.textContent = stored === 'system' ? 'System' : (effective === 'dark' ? 'Dark' : 'Light');
    }
  }

  function setTheme(theme) {
    localStorage.setItem(STORAGE_KEY, theme);
    applyTheme(theme);
  }

  // Apply immediately to avoid FOUC
  const stored = localStorage.getItem(STORAGE_KEY) || 'system';
  applyTheme(stored);

  // Listen for system preference changes
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    const current = localStorage.getItem(STORAGE_KEY) || 'system';
    if (current === 'system') applyTheme('system');
  });

  // Expose globally
  window.ConnectTheme = { setTheme, getEffectiveTheme, themes };

  // Wire up buttons after DOM loads
  document.addEventListener('DOMContentLoaded', () => {
    // Theme buttons with [data-theme-btn]
    document.querySelectorAll('[data-theme-btn]').forEach(btn => {
      btn.addEventListener('click', () => setTheme(btn.dataset.themeBtn));
    });

    // Cycle toggle button
    const cycleBtn = document.getElementById('theme-cycle');
    if (cycleBtn) {
      cycleBtn.addEventListener('click', () => {
        const current = localStorage.getItem(STORAGE_KEY) || 'system';
        const idx = themes.indexOf(current);
        const next = themes[(idx + 1) % themes.length];
        setTheme(next);
      });
    }

    // Re-apply to ensure DOM-based UI is updated
    applyTheme(localStorage.getItem(STORAGE_KEY) || 'system');
  });
})();
