/**
 * app.js — shared utility module loaded on every protected page.
 *
 * Provides: apiFetch, getCurrentUser, setCurrentUser, clearCurrentUser,
 * initDarkMode, formatTimeAgo, showToast, renderAvatar, confirmDelete.
 * On DOMContentLoaded: checkAuth, initDarkMode, load /api/auth/me.
 */

'use strict';

// ─── Theme (runs immediately to avoid flash) ──────────────────────────────────

(function applyTheme() {
  const saved = localStorage.getItem('theme');
  if (saved === 'dark') {
    document.documentElement.classList.add('dark');
  }
})();

// ─── API fetch wrapper ────────────────────────────────────────────────────────

/**
 * apiFetch — wraps fetch against /api/, includes credentials.
 * Throws an Error (with .status) on non-2xx responses.
 * Returns parsed JSON on success.
 */
async function apiFetch(endpoint, options = {}) {
  const url = '/api/' + endpoint;
  const defaultHeaders = {};

  // Don't set Content-Type for FormData (browser sets multipart boundary)
  if (!(options.body instanceof FormData)) {
    defaultHeaders['Content-Type'] = 'application/json';
  }

  const res = await fetch(url, {
    credentials: 'include',
    headers: { ...defaultHeaders, ...(options.headers || {}) },
    ...options,
    // Remove headers key so it is not duplicated above
    ...(options.headers ? { headers: { ...defaultHeaders, ...options.headers } } : {})
  });

  const json = await res.json().catch(() => ({}));

  if (!res.ok) {
    const err = new Error(json.error || `Request failed: ${res.status}`);
    err.status = res.status;
    err.data = json;
    throw err;
  }

  return json;
}

// ─── Current user helpers ─────────────────────────────────────────────────────

function getCurrentUser() {
  try {
    const stored = localStorage.getItem('connect_user');
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

function setCurrentUser(user) {
  if (!user) return;
  localStorage.setItem('connect_user', JSON.stringify({
    userId:    user.id   || user.userId,
    username:  user.username,
    full_name: user.full_name,
    avatar:    user.avatar || ''
  }));
}

function clearCurrentUser() {
  localStorage.removeItem('connect_user');
}

// ─── Auth check ───────────────────────────────────────────────────────────────

async function checkAuth() {
  try {
    const json = await apiFetch('auth/me');
    if (json.success && json.data) {
      setCurrentUser(json.data);
      return json.data;
    }
    throw new Error('Not authenticated');
  } catch (err) {
    clearCurrentUser();
    window.location.href = '/login.html';
    return null;
  }
}

// ─── Dark mode ────────────────────────────────────────────────────────────────

function initDarkMode() {
  const saved = localStorage.getItem('theme');
  if (saved === 'dark') {
    document.documentElement.classList.add('dark');
  }

  const btn = document.getElementById('theme-toggle');
  if (!btn) return;

  updateThemeToggleUI(btn);

  btn.addEventListener('click', () => {
    document.documentElement.classList.toggle('dark');
    const isDark = document.documentElement.classList.contains('dark');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
    updateThemeToggleUI(btn);
  });
}

function updateThemeToggleUI(btn) {
  const isDark = document.documentElement.classList.contains('dark');
  const label = btn.querySelector('.theme-toggle-label');
  const iconEl = btn.querySelector('.theme-toggle-icon');

  if (label) label.textContent = isDark ? 'Light mode' : 'Dark mode';
  if (iconEl) {
    iconEl.innerHTML = isDark
      ? `<circle cx="12" cy="12" r="5"/>
         <line x1="12" y1="1" x2="12" y2="3"/>
         <line x1="12" y1="21" x2="12" y2="23"/>
         <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
         <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
         <line x1="1" y1="12" x2="3" y2="12"/>
         <line x1="21" y1="12" x2="23" y2="12"/>
         <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
         <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>`
      : `<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>`;
  }
}

// ─── Time formatting ──────────────────────────────────────────────────────────

function formatTimeAgo(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  const now  = new Date();
  const diff = Math.floor((now - date) / 1000); // seconds

  if (diff < 60)   return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// ─── Toast notifications ──────────────────────────────────────────────────────

function showToast(message, type = 'info') {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  toast.setAttribute('role', 'status');
  toast.setAttribute('aria-live', 'polite');

  container.appendChild(toast);

  // Animate out and remove
  setTimeout(() => {
    toast.style.animation = 'slideInRight 0.3s ease reverse forwards';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// ─── Avatar renderer ──────────────────────────────────────────────────────────

function renderAvatar(user, size = 'md') {
  const name = user.full_name || user.username || '?';
  const initials = name
    .split(' ')
    .map(w => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  if (user.avatar) {
    return `<img
      src="${escapeHtml(user.avatar)}"
      alt="${escapeHtml(name)}'s avatar"
      class="avatar avatar-${escapeHtml(size)}"
      loading="lazy"
      onerror="this.style.display='none';this.nextElementSibling.style.display='inline-flex'"
    /><span class="avatar-placeholder avatar-${escapeHtml(size)}" style="display:none" aria-hidden="true">${escapeHtml(initials)}</span>`;
  }

  return `<span class="avatar-placeholder avatar-${escapeHtml(size)}" aria-hidden="true">${escapeHtml(initials)}</span>`;
}

// ─── Confirm delete modal ─────────────────────────────────────────────────────

function confirmDelete(message = 'Are you sure you want to delete this?') {
  return new Promise((resolve) => {
    // Remove any existing confirm modal
    const existing = document.getElementById('confirm-modal-overlay');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.id = 'confirm-modal-overlay';
    overlay.className = 'modal-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-labelledby', 'confirm-modal-title');
    overlay.innerHTML = `
      <div class="modal" style="max-width:400px">
        <div class="modal-header">
          <h2 class="modal-title" id="confirm-modal-title">Confirm Delete</h2>
          <button class="modal-close" id="confirm-cancel-x" aria-label="Cancel">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none"
              stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
        <div class="modal-body">
          <p style="color:var(--color-text-muted);font-size:var(--font-size-sm)">${escapeHtml(message)}</p>
        </div>
        <div class="modal-footer">
          <button class="btn btn-ghost btn-sm" id="confirm-cancel-btn">Cancel</button>
          <button class="btn btn-danger btn-sm" id="confirm-delete-btn">Delete</button>
        </div>
      </div>`;

    document.body.appendChild(overlay);

    function cleanup(result) {
      overlay.remove();
      resolve(result);
    }

    overlay.querySelector('#confirm-delete-btn').addEventListener('click', () => cleanup(true));
    overlay.querySelector('#confirm-cancel-btn').addEventListener('click', () => cleanup(false));
    overlay.querySelector('#confirm-cancel-x').addEventListener('click', () => cleanup(false));
    overlay.addEventListener('click', (e) => { if (e.target === overlay) cleanup(false); });
  });
}

// ─── Utility: HTML escaping ───────────────────────────────────────────────────

function escapeHtml(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ─── Sidebar active state ─────────────────────────────────────────────────────

function setActiveNav() {
  const path = window.location.pathname;
  document.querySelectorAll('.nav-item').forEach(link => {
    link.classList.remove('active');
    const href = link.getAttribute('href');
    if (href && (path.endsWith(href) || (href === '/index.html' && path === '/'))) {
      link.classList.add('active');
    }
  });
  document.querySelectorAll('.bottom-nav-item').forEach(link => {
    link.classList.remove('active');
    const href = link.getAttribute('href');
    if (href && (path.endsWith(href) || (href === '/index.html' && path === '/'))) {
      link.classList.add('active');
    }
  });
}

// ─── Populate sidebar user info ───────────────────────────────────────────────

function populateSidebarUser(user) {
  const nameEl   = document.getElementById('sidebar-user-name');
  const handleEl = document.getElementById('sidebar-user-handle');
  const avatarEl = document.getElementById('sidebar-user-avatar');

  if (nameEl)   nameEl.textContent   = user.full_name || user.username;
  if (handleEl) handleEl.textContent = '@' + user.username;
  if (avatarEl) {
    if (user.avatar) {
      avatarEl.innerHTML = `<img src="${escapeHtml(user.avatar)}" alt="Your avatar" class="avatar avatar-sm">`;
    } else {
      const initials = (user.full_name || user.username || '?')
        .split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
      avatarEl.innerHTML = `<span class="avatar-placeholder avatar-sm">${escapeHtml(initials)}</span>`;
    }
  }
}

// ─── Wire topbar search ───────────────────────────────────────────────────────

function initTopbarSearch() {
  const input = document.getElementById('topbar-search-input');
  if (!input) return;
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const q = input.value.trim();
      if (q) window.location.href = `/explore.html?q=${encodeURIComponent(q)}`;
    }
  });
}

// ─── Bootstrap ───────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', async () => {
  initDarkMode();
  setActiveNav();
  initTopbarSearch();

  const user = await checkAuth();
  if (user) {
    populateSidebarUser(user);
    // Expose globally for feed.js / bookmarks.js
    window._currentUser = user;
  }
});

// Expose globally for other page scripts
window.apiFetch       = apiFetch;
window.getCurrentUser = getCurrentUser;
window.setCurrentUser = setCurrentUser;
window.clearCurrentUser = clearCurrentUser;
window.checkAuth      = checkAuth;
window.formatTimeAgo  = formatTimeAgo;
window.showToast      = showToast;
window.renderAvatar   = renderAvatar;
window.confirmDelete  = confirmDelete;
window.escapeHtml     = escapeHtml;
