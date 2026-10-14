/**
 * auth.js — handles login, register, session check, and theme.
 *
 * Works on both login.html and register.html.
 * Also exports checkAuth() for use on protected pages.
 */

'use strict';

// ── Theme ──────────────────────────────────────────────────────────────────

(function initTheme() {
  const saved = localStorage.getItem('theme');
  if (saved === 'dark') {
    document.documentElement.classList.add('dark');
  }
})();

function updateThemeUI() {
  const isDark = document.documentElement.classList.contains('dark');
  const label = document.getElementById('themeLabel');
  const icon = document.getElementById('themeIcon');

  if (label) label.textContent = isDark ? 'Light mode' : 'Dark mode';
  if (icon) {
    icon.innerHTML = isDark
      ? '<circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>'
      : '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>';
  }
}

document.addEventListener('DOMContentLoaded', () => {
  updateThemeUI();

  const themeToggle = document.getElementById('themeToggle');
  if (themeToggle) {
    themeToggle.addEventListener('click', () => {
      document.documentElement.classList.toggle('dark');
      const isDark = document.documentElement.classList.contains('dark');
      localStorage.setItem('theme', isDark ? 'dark' : 'light');
      updateThemeUI();
    });
  }
});

// ── Utilities ──────────────────────────────────────────────────────────────

function showFieldError(fieldId, errorId, message) {
  const field = document.getElementById(fieldId);
  const error = document.getElementById(errorId);
  if (field) field.classList.add('has-error');
  if (error) {
    error.textContent = message;
    error.classList.add('show');
  }
}

function clearFieldError(fieldId, errorId) {
  const field = document.getElementById(fieldId);
  const error = document.getElementById(errorId);
  if (field) field.classList.remove('has-error');
  if (error) {
    error.textContent = '';
    error.classList.remove('show');
  }
}

function clearAllFieldErrors(fieldErrorMap) {
  Object.entries(fieldErrorMap).forEach(([fieldId, errorId]) => {
    clearFieldError(fieldId, errorId);
  });
}

function showAlert(alertId, message, type = 'error') {
  const el = document.getElementById(alertId);
  if (!el) return;
  el.textContent = message;
  el.className = `auth-alert auth-alert-${type} show`;
}

function hideAlert(alertId) {
  const el = document.getElementById(alertId);
  if (el) el.classList.remove('show');
}

function setLoading(btnId, textId, spinnerId, loading) {
  const btn = document.getElementById(btnId);
  const text = document.getElementById(textId);
  const spinner = document.getElementById(spinnerId);

  if (btn)     btn.disabled = loading;
  if (text)    text.style.opacity = loading ? '0.6' : '1';
  if (spinner) spinner.classList.toggle('hidden', !loading);
}

// ── Session check ──────────────────────────────────────────────────────────

/**
 * checkAuth — fetches GET /api/auth/me.
 * If 401 and not on an auth page, redirects to /login.html.
 * Returns the user object on success, null otherwise.
 */
async function checkAuth() {
  const authPages = ['/login.html', '/register.html'];
  const isAuthPage = authPages.some(p => window.location.pathname.endsWith(p));

  try {
    const res = await fetch('/api/auth/me', { credentials: 'include' });
    if (res.ok) {
      const json = await res.json();
      if (json.success && json.data) {
        // Cache minimal user info
        localStorage.setItem('connect_user', JSON.stringify({
          userId:   json.data.id,
          username: json.data.username,
          avatar:   json.data.avatar || ''
        }));
        return json.data;
      }
    }

    // Not authenticated
    if (!isAuthPage) {
      window.location.href = '/login.html';
    }
    return null;
  } catch (err) {
    if (!isAuthPage) {
      window.location.href = '/login.html';
    }
    return null;
  }
}

// ── Login form ─────────────────────────────────────────────────────────────

function initLoginForm() {
  const form = document.getElementById('loginForm');
  if (!form) return;

  const FIELDS = {
    loginEmail:    'loginEmailError',
    loginPassword: 'loginPasswordError'
  };

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideAlert('loginAlert');
    clearAllFieldErrors(FIELDS);

    const email    = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;

    // Client-side validation
    let valid = true;
    if (!email) {
      showFieldError('loginEmail', 'loginEmailError', 'Email is required');
      valid = false;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      showFieldError('loginEmail', 'loginEmailError', 'Enter a valid email address');
      valid = false;
    }
    if (!password) {
      showFieldError('loginPassword', 'loginPasswordError', 'Password is required');
      valid = false;
    }
    if (!valid) return;

    setLoading('loginSubmit', 'loginBtnText', 'loginSpinner', true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password })
      });

      const json = await res.json();

      if (res.ok && json.success) {
        // Store minimal user info
        localStorage.setItem('connect_user', JSON.stringify({
          userId:   json.data.id,
          username: json.data.username,
          avatar:   json.data.avatar || ''
        }));
        window.location.href = '/index.html';
      } else {
        // Handle validation errors
        if (res.status === 422 && Array.isArray(json.data)) {
          json.data.forEach(err => {
            const field = err.path;
            if (field === 'email')    showFieldError('loginEmail',    'loginEmailError',    err.msg);
            if (field === 'password') showFieldError('loginPassword', 'loginPasswordError', err.msg);
          });
        } else {
          showAlert('loginAlert', json.error || 'Login failed. Please try again.');
        }
      }
    } catch (err) {
      showAlert('loginAlert', 'Network error — please check your connection and try again.');
    } finally {
      setLoading('loginSubmit', 'loginBtnText', 'loginSpinner', false);
    }
  });
}

// ── Register form ──────────────────────────────────────────────────────────

function initRegisterForm() {
  const form = document.getElementById('registerForm');
  if (!form) return;

  const FIELDS = {
    regFullName:        'regFullNameError',
    regUsername:        'regUsernameError',
    regEmail:           'regEmailError',
    regPassword:        'regPasswordError',
    regConfirmPassword: 'regConfirmPasswordError'
  };

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideAlert('registerAlert');
    clearAllFieldErrors(FIELDS);

    const full_name       = document.getElementById('regFullName').value.trim();
    const username        = document.getElementById('regUsername').value.trim();
    const email           = document.getElementById('regEmail').value.trim();
    const password        = document.getElementById('regPassword').value;
    const confirmPassword = document.getElementById('regConfirmPassword').value;

    // Client-side validation
    let valid = true;

    if (!full_name) {
      showFieldError('regFullName', 'regFullNameError', 'Full name is required');
      valid = false;
    }
    if (!username) {
      showFieldError('regUsername', 'regUsernameError', 'Username is required');
      valid = false;
    } else if (username.length < 3 || username.length > 30) {
      showFieldError('regUsername', 'regUsernameError', 'Username must be 3–30 characters');
      valid = false;
    } else if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      showFieldError('regUsername', 'regUsernameError', 'Letters, numbers, and underscores only');
      valid = false;
    }
    if (!email) {
      showFieldError('regEmail', 'regEmailError', 'Email is required');
      valid = false;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      showFieldError('regEmail', 'regEmailError', 'Enter a valid email address');
      valid = false;
    }
    if (!password) {
      showFieldError('regPassword', 'regPasswordError', 'Password is required');
      valid = false;
    } else if (password.length < 6) {
      showFieldError('regPassword', 'regPasswordError', 'Password must be at least 6 characters');
      valid = false;
    }
    if (!confirmPassword) {
      showFieldError('regConfirmPassword', 'regConfirmPasswordError', 'Please confirm your password');
      valid = false;
    } else if (password !== confirmPassword) {
      showFieldError('regConfirmPassword', 'regConfirmPasswordError', 'Passwords do not match');
      valid = false;
    }
    if (!valid) return;

    setLoading('registerSubmit', 'registerBtnText', 'registerSpinner', true);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ full_name, username, email, password, confirmPassword })
      });

      const json = await res.json();

      if (res.ok && json.success) {
        localStorage.setItem('connect_user', JSON.stringify({
          userId:   json.data.id,
          username: json.data.username,
          avatar:   json.data.avatar || ''
        }));
        window.location.href = '/index.html';
      } else {
        if (res.status === 422 && Array.isArray(json.data)) {
          json.data.forEach(err => {
            const field = err.path;
            if (field === 'full_name')        showFieldError('regFullName',        'regFullNameError',        err.msg);
            if (field === 'username')          showFieldError('regUsername',         'regUsernameError',         err.msg);
            if (field === 'email')             showFieldError('regEmail',            'regEmailError',            err.msg);
            if (field === 'password')          showFieldError('regPassword',         'regPasswordError',         err.msg);
            if (field === 'confirmPassword')   showFieldError('regConfirmPassword',  'regConfirmPasswordError',  err.msg);
          });
        } else {
          showAlert('registerAlert', json.error || 'Registration failed. Please try again.');
        }
      }
    } catch (err) {
      showAlert('registerAlert', 'Network error — please check your connection and try again.');
    } finally {
      setLoading('registerSubmit', 'registerBtnText', 'registerSpinner', false);
    }
  });
}

// ── Protected-page auth check ──────────────────────────────────────────────

function initProtectedPageCheck() {
  const authPages = ['/login.html', '/register.html'];
  const isAuthPage = authPages.some(p => window.location.pathname.endsWith(p));
  if (!isAuthPage) {
    checkAuth();
  }
}

// ── Bootstrap ─────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  initLoginForm();
  initRegisterForm();
  initProtectedPageCheck();
});

// Expose for use by other page scripts
window.checkAuth = checkAuth;
