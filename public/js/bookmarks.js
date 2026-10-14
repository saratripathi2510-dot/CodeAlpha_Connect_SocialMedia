/**
 * bookmarks.js — bookmarks page logic.
 *
 * Depends on app.js (apiFetch, showToast, formatTimeAgo,
 * renderAvatar, confirmDelete, escapeHtml).
 * Uses renderPost from feed.js patterns — duplicated here so
 * bookmarks.html does not need to load feed.js.
 */

'use strict';

// ─── Render a single post card (same structure as feed.js) ────────────────────

function renderPost(post) {
  const currentUser = window._currentUser;
  const liked      = !!post.is_liked;
  const bookmarked = !!post.is_bookmarked;

  const avatarHtml = renderAvatar(
    { full_name: post.full_name, username: post.username, avatar: post.avatar },
    'sm'
  );

  const imageHtml = post.image
    ? `<div class="post-image-container">
         <img src="${escapeHtml(post.image)}" alt="Post image" class="post-image" loading="lazy" />
       </div>`
    : '';

  return `
    <article class="post-card" data-post-id="${post.id}" aria-label="Post by ${escapeHtml(post.full_name || post.username)}">
      <div class="post-header">
        <a class="post-author" href="/profile.html?user=${encodeURIComponent(post.username)}"
          aria-label="View ${escapeHtml(post.full_name || post.username)}'s profile">
          ${avatarHtml}
          <div class="post-author-info">
            <span class="post-author-name">${escapeHtml(post.full_name || post.username)}</span>
            <span class="post-author-meta">@${escapeHtml(post.username)} · ${formatTimeAgo(post.created_at)}</span>
          </div>
        </a>
      </div>

      <div class="post-content">${escapeHtml(post.content)}</div>

      ${imageHtml}

      <div class="post-stats" aria-label="Post statistics">
        <span>${post.like_count || 0} like${post.like_count === 1 ? '' : 's'}</span>
        <span>${post.comment_count || 0} comment${post.comment_count === 1 ? '' : 's'}</span>
      </div>

      <div class="post-actions" role="group" aria-label="Post actions">
        <button
          class="post-action-btn like-btn${liked ? ' liked' : ''}"
          data-action="like"
          data-post-id="${post.id}"
          data-liked="${liked ? '1' : '0'}"
          aria-label="${liked ? 'Unlike' : 'Like'} post"
          aria-pressed="${liked}"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18"
            fill="${liked ? 'currentColor' : 'none'}"
            stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
          </svg>
          <span class="like-count">${post.like_count || 0}</span>
        </button>

        <a
          href="/index.html?post=${post.id}"
          class="post-action-btn"
          aria-label="View comments"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none"
            stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
          <span>${post.comment_count || 0}</span>
        </a>

        <button
          class="post-action-btn bookmark-btn bookmarked"
          data-action="unbookmark"
          data-post-id="${post.id}"
          aria-label="Remove bookmark"
          aria-pressed="true"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18"
            fill="currentColor"
            stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
          </svg>
        </button>
      </div>
    </article>`;
}

// ─── Load bookmarks ───────────────────────────────────────────────────────────

async function loadBookmarks() {
  const listEl = document.getElementById('bookmarks-list');
  if (!listEl) return;

  listEl.setAttribute('aria-busy', 'true');

  try {
    const json = await apiFetch('bookmarks');
    const posts = json.data || [];

    listEl.setAttribute('aria-busy', 'false');

    if (posts.length === 0) {
      listEl.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon" aria-hidden="true">
            <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" fill="none"
              stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
              <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
            </svg>
          </div>
          <h3>No bookmarks yet</h3>
          <p>Posts you bookmark will appear here. Find something worth saving!</p>
          <a href="/index.html" class="btn btn-primary btn-sm" style="margin-top:var(--space-4)">Browse feed</a>
        </div>`;
      return;
    }

    listEl.innerHTML = posts.map(renderPost).join('');
  } catch (err) {
    console.error('loadBookmarks error:', err);
    listEl.setAttribute('aria-busy', 'false');
    listEl.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon" aria-hidden="true">⚠</div>
        <h3>Could not load bookmarks</h3>
        <p>${escapeHtml(err.message || 'Please try again.')}</p>
      </div>`;
  }
}

// ─── Event delegation for like and unbookmark ─────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  const listEl = document.getElementById('bookmarks-list');
  if (!listEl) return;

  listEl.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;

    const action  = btn.dataset.action;
    const postId  = btn.dataset.postId;
    const postCard = btn.closest('.post-card');

    if (action === 'like') {
      const isLiked = btn.dataset.liked === '1';
      const method  = isLiked ? 'DELETE' : 'POST';
      const countEl = btn.querySelector('.like-count');
      const svgPath = btn.querySelector('svg path');
      const current = parseInt(countEl.textContent, 10) || 0;
      const newCount = isLiked ? Math.max(0, current - 1) : current + 1;

      // Optimistic
      btn.dataset.liked = isLiked ? '0' : '1';
      btn.classList.toggle('liked', !isLiked);
      btn.setAttribute('aria-pressed', String(!isLiked));
      if (svgPath) svgPath.setAttribute('fill', !isLiked ? 'currentColor' : 'none');
      countEl.textContent = newCount;

      try {
        const json = await apiFetch(`likes/posts/${postId}`, { method });
        countEl.textContent = json.data.like_count;
      } catch (err) {
        // Revert
        btn.dataset.liked = isLiked ? '1' : '0';
        btn.classList.toggle('liked', isLiked);
        btn.setAttribute('aria-pressed', String(isLiked));
        if (svgPath) svgPath.setAttribute('fill', isLiked ? 'currentColor' : 'none');
        countEl.textContent = current;
        showToast(err.message || 'Could not update like', 'error');
      }

    } else if (action === 'unbookmark') {
      try {
        await apiFetch(`bookmarks/posts/${postId}`, { method: 'DELETE' });
        if (postCard) {
          postCard.style.transition = 'opacity 0.3s ease';
          postCard.style.opacity = '0';
          setTimeout(() => {
            postCard.remove();
            // Show empty state if no more cards
            if (!listEl.querySelector('.post-card')) {
              listEl.innerHTML = `
                <div class="empty-state">
                  <div class="empty-state-icon" aria-hidden="true">
                    <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" fill="none"
                      stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
                      <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
                    </svg>
                  </div>
                  <h3>No bookmarks yet</h3>
                  <p>Posts you bookmark will appear here.</p>
                  <a href="/index.html" class="btn btn-primary btn-sm" style="margin-top:var(--space-4)">Browse feed</a>
                </div>`;
            }
          }, 300);
        }
        showToast('Bookmark removed', 'info');
      } catch (err) {
        showToast(err.message || 'Could not remove bookmark', 'error');
      }
    }
  });
});

// ─── Bootstrap ────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  loadBookmarks();
});
