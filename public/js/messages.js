/**
 * messages.js — direct messages page logic.
 *
 * Depends on app.js (apiFetch, showToast, formatTimeAgo,
 * renderAvatar, escapeHtml, _currentUser).
 */

'use strict';

let _activePartnerId   = null;
let _activePartnerName = '';
let _activePartnerHandle = '';

// ─── Load conversations list ──────────────────────────────────────────────────

async function loadConversations() {
  const listEl = document.getElementById('conversations-list');
  if (!listEl) return;

  listEl.innerHTML = `<div class="loading-state" style="padding:var(--space-6)"><span class="spinner"></span></div>`;

  try {
    const json = await apiFetch('messages/conversations');
    const convs = json.data || [];

    if (convs.length === 0) {
      listEl.innerHTML = `
        <div style="padding:var(--space-6);text-align:center;color:var(--color-text-muted)">
          <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" fill="none"
            stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"
            style="margin:0 auto var(--space-3);opacity:0.35" aria-hidden="true">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
          <p class="text-sm">No conversations yet.</p>
          <p class="text-xs" style="margin-top:4px">Visit a profile to send a message.</p>
        </div>`;
      return;
    }

    listEl.innerHTML = convs.map(renderConversationItem).join('');

    // Re-select active conversation if one is open
    if (_activePartnerId) {
      const item = listEl.querySelector(`.conversation-item[data-user-id="${_activePartnerId}"]`);
      if (item) item.classList.add('active');
    }

    // Wire click handlers
    listEl.querySelectorAll('.conversation-item').forEach(item => {
      item.addEventListener('click', () => {
        const userId   = item.dataset.userId;
        const name     = item.dataset.name;
        const username = item.dataset.username;
        selectConversation(userId, name, username);
      });
    });
  } catch (err) {
    console.error('loadConversations error:', err);
    listEl.innerHTML = `<div class="empty-state" style="padding:var(--space-6)"><p class="text-sm text-muted">Could not load conversations.</p></div>`;
  }
}

function renderConversationItem(conv) {
  const avatar = renderAvatar(
    { full_name: conv.partner_name, username: conv.partner_username, avatar: conv.partner_avatar },
    'sm'
  );
  const unreadBadge = conv.unread_count > 0
    ? `<span class="conversation-unread" aria-label="${conv.unread_count} unread">${conv.unread_count}</span>`
    : '';

  return `
    <div
      class="conversation-item"
      data-user-id="${conv.partner_id}"
      data-name="${escapeHtml(conv.partner_name || conv.partner_username)}"
      data-username="${escapeHtml(conv.partner_username)}"
      role="listitem"
      tabindex="0"
      aria-label="Conversation with ${escapeHtml(conv.partner_name || conv.partner_username)}"
    >
      ${avatar}
      <div class="conversation-info">
        <div class="conversation-name">${escapeHtml(conv.partner_name || conv.partner_username)}</div>
        <div class="conversation-preview">${escapeHtml(conv.last_message || '')}</div>
      </div>
      <div class="conversation-meta">
        <span class="conversation-time">${formatTimeAgo(conv.last_message_at)}</span>
        ${unreadBadge}
      </div>
    </div>`;
}

// ─── Select and load conversation thread ─────────────────────────────────────

async function selectConversation(userId, name, username) {
  _activePartnerId   = userId;
  _activePartnerName = name;
  _activePartnerHandle = username;

  // Highlight active conversation
  document.querySelectorAll('.conversation-item').forEach(el => {
    el.classList.toggle('active', el.dataset.userId === String(userId));
  });

  // Show thread panel on mobile
  const threadPanel = document.getElementById('thread-panel');
  if (threadPanel) threadPanel.classList.add('open');

  // Update thread header
  const headerEl = document.getElementById('thread-header');
  if (headerEl) {
    headerEl.innerHTML = `
      <button class="btn-icon thread-back-btn" id="thread-back-btn" aria-label="Back to conversations">
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none"
          stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" aria-hidden="true">
          <polyline points="15 18 9 12 15 6"/>
        </svg>
      </button>
      <a href="/profile.html?user=${encodeURIComponent(username)}" style="display:flex;align-items:center;gap:var(--space-2);text-decoration:none;flex:1">
        ${renderAvatar({ full_name: name, username: username, avatar: '' }, 'sm')}
        <div class="thread-header-info">
          <div class="thread-partner-name">${escapeHtml(name)}</div>
          <div class="thread-partner-handle">@${escapeHtml(username)}</div>
        </div>
      </a>`;

    // Wire back button
    const backBtn = headerEl.querySelector('#thread-back-btn');
    if (backBtn) {
      backBtn.addEventListener('click', () => {
        if (threadPanel) threadPanel.classList.remove('open');
      });
    }
  }

  // Show compose area
  const composeArea = document.getElementById('compose-area');
  if (composeArea) composeArea.classList.remove('hidden');

  await loadThread(userId);
  await markConversationRead(userId);
}

// ─── Load message thread ──────────────────────────────────────────────────────

async function loadThread(userId) {
  const threadEl = document.getElementById('message-thread');
  if (!threadEl) return;

  const currentUser = window._currentUser;

  threadEl.innerHTML = `<div class="loading-state"><span class="spinner"></span></div>`;

  try {
    const json = await apiFetch(`messages/conversation/${userId}`);
    const messages = json.data || [];

    if (messages.length === 0) {
      threadEl.innerHTML = `
        <div class="thread-empty-state">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
          <p>No messages yet. Say hello!</p>
        </div>`;
      return;
    }

    threadEl.innerHTML = messages.map(m => renderMessageBubble(m, currentUser)).join('');
    scrollToBottom(threadEl);
  } catch (err) {
    threadEl.innerHTML = `<div class="thread-empty-state"><p>Could not load messages.</p></div>`;
  }
}

function renderMessageBubble(msg, currentUser) {
  const isSent = currentUser && msg.sender_id === currentUser.id;
  const bubbleClass = isSent ? 'sent-bubble' : 'received';
  const wrapClass = isSent ? 'sent' : '';

  return `
    <div class="message-bubble-wrap ${wrapClass}">
      ${!isSent ? renderAvatar({ full_name: msg.sender_name, username: msg.sender_username, avatar: msg.sender_avatar }, 'xs') : ''}
      <div>
        <div class="message-bubble ${bubbleClass}">${escapeHtml(msg.content)}</div>
        <div class="message-time">${formatTimeAgo(msg.created_at)}</div>
      </div>
    </div>`;
}

function scrollToBottom(el) {
  if (el) el.scrollTop = el.scrollHeight;
}

// ─── Mark conversation read ───────────────────────────────────────────────────

async function markConversationRead(userId) {
  try {
    await apiFetch(`messages/conversation/${userId}/read`, { method: 'PUT' });
    // Update unread badge in conversation list
    const item = document.querySelector(`.conversation-item[data-user-id="${userId}"]`);
    if (item) {
      const badge = item.querySelector('.conversation-unread');
      if (badge) badge.remove();
    }
  } catch {
    // Silently ignore
  }
}

// ─── Send a message ───────────────────────────────────────────────────────────

function initCompose() {
  const sendBtn  = document.getElementById('send-message-btn');
  const inputEl  = document.getElementById('message-input');
  const threadEl = document.getElementById('message-thread');

  if (!sendBtn || !inputEl) return;

  async function sendMessage() {
    const content = inputEl.value.trim();
    if (!content || !_activePartnerId) return;

    sendBtn.disabled = true;
    try {
      const json = await apiFetch('messages/send', {
        method: 'POST',
        body: JSON.stringify({ receiver_id: parseInt(_activePartnerId, 10), content })
      });

      const msg = json.data;
      const currentUser = window._currentUser;

      // Append to thread
      const empty = threadEl && threadEl.querySelector('.thread-empty-state');
      if (empty) empty.remove();

      if (threadEl) {
        const div = document.createElement('div');
        div.innerHTML = renderMessageBubble(msg, currentUser);
        threadEl.appendChild(div.firstElementChild);
        scrollToBottom(threadEl);
      }

      inputEl.value = '';
      inputEl.style.height = 'auto';

      // Refresh conversation list to update preview
      loadConversations();
    } catch (err) {
      showToast(err.message || 'Could not send message', 'error');
    } finally {
      sendBtn.disabled = false;
    }
  }

  sendBtn.addEventListener('click', sendMessage);

  inputEl.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });

  // Auto-resize textarea
  inputEl.addEventListener('input', () => {
    inputEl.style.height = 'auto';
    inputEl.style.height = Math.min(inputEl.scrollHeight, 120) + 'px';
  });
}

// ─── Check for ?user= query param to pre-open a conversation ──────────────────

function checkQueryParam() {
  const params = new URLSearchParams(window.location.search);
  const username = params.get('user');
  if (!username) return;

  // Look up the user and open conversation
  apiFetch(`users/${encodeURIComponent(username)}`)
    .then(json => {
      if (json.success && json.data) {
        const u = json.data;
        selectConversation(u.id, u.full_name || u.username, u.username);
      }
    })
    .catch(() => {});
}

// ─── Bootstrap ────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  loadConversations();
  initCompose();
  checkQueryParam();
});
