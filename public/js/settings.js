/**
 * settings.js — settings page logic.
 *
 * Depends on app.js (apiFetch, showToast, confirmDelete,
 * clearCurrentUser, escapeHtml).
 */

'use strict';

// ─── Pre-fill account info form ───────────────────────────────────────────────

async function prefillAccountForm() {
  try {
    const json = await apiFetch('auth/me');
    if (!json.success || !json.data) return;
    const user = json.data;

    const nameEl  = document.getElementById('settings-full-name');
    const emailEl = document.getElementById('settings-email');

    if (nameEl)  nameEl.value  = user.full_name || '';
    if (emailEl) emailEl.value = user.email     || '';
  } catch {
    // Non-critical
  }
}

// ─── Account info form ────────────────────────────────────────────────────────

function initAccountInfoForm() {
  const form    = document.getElementById('account-info-form');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const full_name = document.getElementById('settings-full-name').value.trim();
    const email     = document.getElementById('settings-email').value.trim();

    if (!full_name) { showToast('Full name is required', 'error'); return; }
    if (!email)     { showToast('Email is required', 'error');     return; }

    const btn     = document.getElementById('account-save-btn');
    const btnText = document.getElementById('account-save-text');
    const spinner = document.getElementById('account-save-spinner');

    btn.disabled = true;
    btnText.style.opacity = '0.6';
    spinner.classList.remove('hidden');

    try {
      const formData = new FormData();
      formData.append('full_name', full_name);
      // email update goes through a separate flow if needed; use users/me for profile fields
      await apiFetch('users/me', { method: 'PUT', body: formData });
      showToast('Account info updated', 'info');

      // Update localStorage cache
      const stored = window.getCurrentUser && window.getCurrentUser();
      if (stored) {
        stored.full_name = full_name;
        window.setCurrentUser && window.setCurrentUser(stored);
      }
    } catch (err) {
      showToast(err.message || 'Could not update account info', 'error');
    } finally {
      btn.disabled = false;
      btnText.style.opacity = '1';
      spinner.classList.add('hidden');
    }
  });
}

// ─── Change password form ─────────────────────────────────────────────────────

function initChangePasswordForm() {
  const form = document.getElementById('change-password-form');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const currentPassword  = document.getElementById('current-password').value;
    const newPassword      = document.getElementById('new-password').value;
    const confirmPassword  = document.getElementById('confirm-new-password').value;

    if (!currentPassword) { showToast('Current password is required', 'error'); return; }
    if (newPassword.length < 6) { showToast('New password must be at least 6 characters', 'error'); return; }
    if (newPassword !== confirmPassword) { showToast('Passwords do not match', 'error'); return; }

    const btn     = document.getElementById('change-pw-btn');
    const btnText = document.getElementById('change-pw-text');
    const spinner = document.getElementById('change-pw-spinner');

    btn.disabled = true;
    btnText.style.opacity = '0.6';
    spinner.classList.remove('hidden');

    try {
      await apiFetch('auth/change-password', {
        method: 'PUT',
        body: JSON.stringify({ currentPassword, newPassword })
      });

      // Clear fields
      document.getElementById('current-password').value  = '';
      document.getElementById('new-password').value      = '';
      document.getElementById('confirm-new-password').value = '';

      showToast('Password updated successfully', 'info');
    } catch (err) {
      showToast(err.message || 'Could not update password', 'error');
    } finally {
      btn.disabled = false;
      btnText.style.opacity = '1';
      spinner.classList.add('hidden');
    }
  });
}

// ─── Dark mode toggle (settings page) ────────────────────────────────────────

function initSettingsDarkMode() {
  const toggle = document.getElementById('settings-dark-toggle');
  if (!toggle) return;

  // Sync with current state
  const isDark = document.documentElement.classList.contains('dark');
  toggle.checked = isDark;

  toggle.addEventListener('change', () => {
    if (toggle.checked) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }

    // Keep topbar theme-toggle button in sync
    const themeBtn = document.getElementById('theme-toggle');
    if (themeBtn && typeof updateThemeToggleUI === 'function') {
      updateThemeToggleUI(themeBtn);
    }
  });

  // Keep settings toggle in sync if the topbar button is used
  const themeBtn = document.getElementById('theme-toggle');
  if (themeBtn) {
    themeBtn.addEventListener('click', () => {
      const dark = document.documentElement.classList.contains('dark');
      toggle.checked = dark;
    });
  }
}

// ─── Delete account ───────────────────────────────────────────────────────────

function initDeleteAccount() {
  const btn = document.getElementById('delete-account-btn');
  if (!btn) return;

  btn.addEventListener('click', async () => {
    const confirmed = await confirmDelete(
      'Delete your account permanently? All your posts, comments, likes, and messages will be removed. This cannot be undone.'
    );
    if (!confirmed) return;

    btn.disabled = true;

    try {
      await apiFetch('auth/delete-account', { method: 'DELETE' });
      clearCurrentUser();
      showToast('Account deleted. Goodbye!', 'info');
      setTimeout(() => { window.location.href = '/login.html'; }, 1500);
    } catch (err) {
      btn.disabled = false;
      showToast(err.message || 'Could not delete account', 'error');
    }
  });
}

// ─── Bootstrap ────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  prefillAccountForm();
  initAccountInfoForm();
  initChangePasswordForm();
  initSettingsDarkMode();
  initDeleteAccount();
});
