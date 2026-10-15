/**
 * notifications.js — notifications page logic.
 *
 * Depends on app.js (apiFetch, showToast, formatTimeAgo,
 * renderAvatar, escapeHtml).
 */

'use strict';

let _allNotifications = [];
let _activeFilter = 'all';

// ─── Fetch and render notifications ──────────────────────────────────────────

async function fetchNotifications() {
  const listEl = document.getElementById('notifications-list');
  if (!listEl) return;

  listEl.innerHTML = `<div class="loading-state"><span class="spinner"></span><span>Loading…</span></div>`;

  try {
    const json = await apiFetch('notifications');
    _allNotifications = json.data || [];
    renderNotifications(_allNotifications, _activeFilter);
  } catch (err) {
    console.error('fetchNotifications error:', err);
    listEl.innerHTML = `
      <div class="empty-state" style="padding:var(--space-8)">
        <div class="empty-state-icon" aria-hidden="true">⚠</div>
        <h3>Could not load notifications</h3>
        <p>${escapeHtml(err.message || 'Please try again.')}</p>
      </div>`;
  }
}

function renderNotifications(notifications, filter) {
  const listEl = document.getElementById('notifications-list');
  if (!listEl) return;

  const filtered = filter === 'all'
    ? notifications
    : notifications.filter(n => n.type === filter);

  if (filtered.length === 0) {
    listEl.innerHTML = `
      <div class="empty-state" style="padding:var(--space-8)">
        <div class="empty-state-icon" aria-hidden="true">🔔</div>
        <h3>No ${filter === 'all' ? '' : filter} notifications</h3>
        <p>${filter === 'all' ? 'You have no notifications yet.' : 'Nothing to show here.'}</p>
      </div>`;
    return;
  }

  listEl.innerHTML = filtered.map(renderNotificationItem).join('');
}

function renderNotificationItem(notif) {
  const isUnread = !notif.read;
  const actor = {
    full_name: notif.actor_name,
    username: notif.actor_username,
    avatar: notif.actor_avatar
  };
  const avatarHtml = renderAvatar(actor, 'sm');

  let iconHtml = '';
  let message = '';
  let link = `/profile.html?user=${encodeURIComponent(notif.actor_username)}`;

  if (notif.type === 'like') {
    iconHtml = `<div class="notif-icon like" aria-hidden="true">❤</div>`;
    message = `<strong>${escapeHtml(notif.actor_name || notif.actor_username)}</strong> liked your post`;
    if (notif.post_id) link = `/index.html?post=${notif.post_id}`;
  } else if (notif.type === 'comment') {
    iconHtml = `<div class="notif-icon comment" aria-hidden="true">💬</div>`;
    message = `<strong>${escapeHtml(notif.actor_name || notif.actor_username)}</strong> commented on your post`;
    if (notif.post_id) link = `/index.html?post=${notif.post_id}`;
  } else if (notif.type === 'follow') {
    iconHtml = `<div class="notif-icon follow" aria-hidden="true">👤</div>`;
    message = `<strong>${escapeHtml(notif.actor_name || notif.actor_username)}</strong> started following you`;
  } else {
    iconHtml = `<div class="notif-icon" aria-hidden="true">🔔</div>`;
    message = `<strong>${escapeHtml(notif.actor_name || notif.actor_username)}</strong> interacted with you`;
  }

  const snippet = notif.post_snippet
    ? `<div class="notif-snippet">${escapeHtml(notif.post_snippet)}</div>`
    : '';

  return `
    <a
      class="notif-item${isUnread ? ' unread' : ''}"
      href="${link}"
      data-notif-id="${notif.id}"
      role="listitem"
      aria-label="${message.replace(/<[^>]+>/g, '')}"
    >
      <div style="position:relative;flex-shrink:0">
        ${avatarHtml}
        ${iconHtml}
      </div>
      <div class="notif-text">
        <span>${message}</span>
        ${snippet}
        <div class="notif-time">${formatTimeAgo(notif.created_at)}</div>
      </div>
      ${isUnread ? '<span class="badge badge-unread" aria-label="Unread" style="flex-shrink:0"></span>' : ''}
    </a>`;
}

// ─── Update nav badge ─────────────────────────────────────────────────────────

async function updateNotifBadge() {
  try {
    const json = await apiFetch('notifications/unread-count');
    const count = (json.data && json.data.count) || 0;

    // Update sidebar badge on notifications nav item
    const navBadge = document.getElementById('notif-badge');
    if (navBadge) {
      if (count > 0) {
        navBadge.textContent = count > 99 ? '99+' : String(count);
        navBadge.classList.remove('hidden');
      } else {
        navBadge.classList.add('hidden');
      }
    }

    // Update topbar dot
    const dot = document.getElementById('notif-dot');
    if (dot) {
      if (count > 0) dot.classList.remove('hidden');
      else dot.classList.add('hidden');
    }
  } catch {
    // Silently ignore badge update failures
  }
}

// ─── Wire filter tabs ─────────────────────────────────────────────────────────

function initFilterTabs() {
  const tabs = document.querySelectorAll('.notif-filter-tab');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => {
        t.classList.remove('active');
        t.setAttribute('aria-selected', 'false');
      });
      tab.classList.add('active');
      tab.setAttribute('aria-selected', 'true');
      _activeFilter = tab.dataset.filter;
      renderNotifications(_allNotifications, _activeFilter);
    });
  });
}

// ─── Mark all read ────────────────────────────────────────────────────────────

function initMarkAllRead() {
  const btn = document.getElementById('mark-all-read-btn');
  if (!btn) return;
  btn.addEventListener('click', async () => {
    try {
      await apiFetch('notifications/mark-read', { method: 'PUT' });
      _allNotifications = _allNotifications.map(n => ({ ...n, read: 1 }));
      renderNotifications(_allNotifications, _activeFilter);
      updateNotifBadge();
      showToast('All notifications marked as read', 'info');
    } catch (err) {
      showToast(err.message || 'Could not mark notifications as read', 'error');
    }
  });
}

// ─── Mark single notification read on click ───────────────────────────────────

function initNotifItemClick() {
  const listEl = document.getElementById('notifications-list');
  if (!listEl) return;

  listEl.addEventListener('click', async (e) => {
    const item = e.target.closest('.notif-item[data-notif-id]');
    if (!item) return;
    const id = item.dataset.notifId;
    if (!id) return;
    // Mark read
    try {
      await apiFetch(`notifications/${id}/read`, { method: 'PUT' });
      const notif = _allNotifications.find(n => String(n.id) === String(id));
      if (notif) notif.read = 1;
      item.classList.remove('unread');
      const badge = item.querySelector('.badge-unread');
      if (badge) badge.remove();
      updateNotifBadge();
    } catch {
      // Non-critical, allow navigation to proceed
    }
  });
}

// ─── Bootstrap ────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  fetchNotifications();
  initFilterTabs();
  initMarkAllRead();
  initNotifItemClick();
  updateNotifBadge();

  // Poll for unread count every 30 seconds
  setInterval(updateNotifBadge, 30000);
});

// Expose for use by app.js on other pages
window.updateNotifBadge = updateNotifBadge;
