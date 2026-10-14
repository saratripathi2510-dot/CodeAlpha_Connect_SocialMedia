/**
 * feed.js — main feed page logic.
 *
 * Depends on app.js being loaded first (provides apiFetch, showToast,
 * formatTimeAgo, renderAvatar, confirmDelete, escapeHtml, _currentUser).
 */

'use strict';

// ─── State ────────────────────────────────────────────────────────────────────

let _activeCommentPostId = null;  // postId whose comment modal is open

// ─── Render a single post card ────────────────────────────────────────────────

function renderPost(post) {
  const currentUser = window._currentUser;
  const isOwn = currentUser && (currentUser.id === post.user_id);
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

  const moreMenu = isOwn
    ? `<div class="dropdown" data-dropdown>
         <button class="post-more-btn" aria-label="More options" data-more-toggle aria-expanded="false" aria-haspopup="true">
           <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none"
             stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" aria-hidden="true">
             <circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/>
           </svg>
         </button>
         <ul class="dropdown-menu hidden" role="menu">
           <li role="menuitem">
             <button class="dropdown-item" data-action="edit-post" data-post-id="${post.id}">
               <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none"
                 stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" aria-hidden="true">
                 <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                 <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
               </svg>
               Edit post
             </button>
           </li>
           <li role="menuitem">
             <button class="dropdown-item danger" data-action="delete-post" data-post-id="${post.id}">
               <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none"
                 stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" aria-hidden="true">
                 <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                 <path d="M10 11v6"/><path d="M14 11v6"/>
                 <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
               </svg>
               Delete post
             </button>
           </li>
         </ul>
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
        ${moreMenu}
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

        <button
          class="post-action-btn comment-btn"
          data-action="open-comments"
          data-post-id="${post.id}"
          aria-label="View comments"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none"
            stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
          <span class="comment-count">${post.comment_count || 0}</span>
        </button>

        <button
          class="post-action-btn bookmark-btn${bookmarked ? ' bookmarked' : ''}"
          data-action="bookmark"
          data-post-id="${post.id}"
          data-bookmarked="${bookmarked ? '1' : '0'}"
          aria-label="${bookmarked ? 'Remove bookmark' : 'Bookmark'} post"
          aria-pressed="${bookmarked}"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18"
            fill="${bookmarked ? 'currentColor' : 'none'}"
            stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
          </svg>
        </button>

        <button
          class="post-action-btn share-btn"
          data-action="share"
          data-post-id="${post.id}"
          aria-label="Copy link to post"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none"
            stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>
            <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
          </svg>
        </button>
      </div>
    </article>`;
}

// ─── Load feed ────────────────────────────────────────────────────────────────

async function loadFeed() {
  const feedList = document.getElementById('feed-list');
  if (!feedList) return;

  feedList.setAttribute('aria-busy', 'true');
  feedList.innerHTML = `<div class="loading-state"><span class="spinner"></span><span>Loading posts…</span></div>`;

  try {
    let json;
    try {
      json = await apiFetch('posts/feed');
    } catch (err) {
      if (err.status === 401) {
        json = await apiFetch('posts');
      } else {
        throw err;
      }
    }

    const posts = (json.data || []);
    feedList.setAttribute('aria-busy', 'false');

    if (posts.length === 0) {
      feedList.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon" aria-hidden="true">✦</div>
          <h3>Nothing here yet</h3>
          <p>Follow some people or create your first post to get started.</p>
        </div>`;
      return;
    }

    feedList.innerHTML = posts.map(renderPost).join('');
  } catch (err) {
    console.error('loadFeed error:', err);
    feedList.setAttribute('aria-busy', 'false');
    feedList.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon" aria-hidden="true">⚠</div>
        <h3>Could not load feed</h3>
        <p>${escapeHtml(err.message || 'Please try again.')}</p>
      </div>`;
  }
}

// ─── Event delegation on #feed-list ──────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  const feedList = document.getElementById('feed-list');
  if (!feedList) return;

  feedList.addEventListener('click', async (e) => {
    // More options toggle
    const moreToggle = e.target.closest('[data-more-toggle]');
    if (moreToggle) {
      e.stopPropagation();
      const dropdown = moreToggle.closest('[data-dropdown]');
      const menu = dropdown && dropdown.querySelector('.dropdown-menu');
      if (menu) {
        const isOpen = !menu.classList.contains('hidden');
        closeAllDropdowns();
        if (!isOpen) {
          menu.classList.remove('hidden');
          moreToggle.setAttribute('aria-expanded', 'true');
        }
      }
      return;
    }

    // Click outside dropdown closes it
    const actionBtn = e.target.closest('[data-action]');
    if (!actionBtn) {
      closeAllDropdowns();
      return;
    }

    const action = actionBtn.dataset.action;
    const postId = actionBtn.dataset.postId;
    const postCard = actionBtn.closest('.post-card');

    if (action === 'like') {
      await handleLike(actionBtn, postId, postCard);
    } else if (action === 'bookmark') {
      await handleBookmark(actionBtn, postId, postCard);
    } else if (action === 'open-comments') {
      await openCommentsModal(postId);
    } else if (action === 'share') {
      handleShare(postId);
    } else if (action === 'edit-post') {
      closeAllDropdowns();
      openEditModal(postId, postCard);
    } else if (action === 'delete-post') {
      closeAllDropdowns();
      await handleDeletePost(postId, postCard);
    }
  });
});

// Close open dropdowns
function closeAllDropdowns() {
  document.querySelectorAll('.dropdown-menu:not(.hidden)').forEach(menu => {
    menu.classList.add('hidden');
    const toggle = menu.closest('[data-dropdown]')?.querySelector('[data-more-toggle]');
    if (toggle) toggle.setAttribute('aria-expanded', 'false');
  });
}
document.addEventListener('click', closeAllDropdowns);

// ─── Like / Unlike ────────────────────────────────────────────────────────────

async function handleLike(btn, postId, postCard) {
  const isLiked = btn.dataset.liked === '1';
  const method  = isLiked ? 'DELETE' : 'POST';

  // Optimistic update
  const countEl = btn.querySelector('.like-count');
  const svgPath = btn.querySelector('svg path');
  const current = parseInt(countEl.textContent, 10) || 0;
  const newCount = isLiked ? Math.max(0, current - 1) : current + 1;

  btn.dataset.liked = isLiked ? '0' : '1';
  btn.classList.toggle('liked', !isLiked);
  btn.setAttribute('aria-pressed', String(!isLiked));
  btn.setAttribute('aria-label', (!isLiked ? 'Unlike' : 'Like') + ' post');
  if (svgPath) svgPath.setAttribute('fill', !isLiked ? 'currentColor' : 'none');
  countEl.textContent = newCount;

  // Update stats line
  updatePostStats(postCard, !isLiked ? newCount : newCount, null);

  try {
    const json = await apiFetch(`likes/posts/${postId}`, { method });
    const real = json.data.like_count;
    countEl.textContent = real;
    updatePostStats(postCard, real, null);
  } catch (err) {
    // Revert optimistic update
    btn.dataset.liked = isLiked ? '1' : '0';
    btn.classList.toggle('liked', isLiked);
    btn.setAttribute('aria-pressed', String(isLiked));
    btn.setAttribute('aria-label', (isLiked ? 'Unlike' : 'Like') + ' post');
    if (svgPath) svgPath.setAttribute('fill', isLiked ? 'currentColor' : 'none');
    countEl.textContent = current;
    updatePostStats(postCard, current, null);
    showToast(err.message || 'Could not update like', 'error');
  }
}

// ─── Bookmark ─────────────────────────────────────────────────────────────────

async function handleBookmark(btn, postId) {
  const isBookmarked = btn.dataset.bookmarked === '1';
  const method = isBookmarked ? 'DELETE' : 'POST';

  // Optimistic
  btn.dataset.bookmarked = isBookmarked ? '0' : '1';
  btn.classList.toggle('bookmarked', !isBookmarked);
  btn.setAttribute('aria-pressed', String(!isBookmarked));
  btn.setAttribute('aria-label', (!isBookmarked ? 'Remove bookmark' : 'Bookmark') + ' post');
  const svgPath = btn.querySelector('svg path');
  if (svgPath) svgPath.setAttribute('fill', !isBookmarked ? 'currentColor' : 'none');

  try {
    await apiFetch(`bookmarks/posts/${postId}`, { method });
    showToast(isBookmarked ? 'Bookmark removed' : 'Post bookmarked', 'info');
  } catch (err) {
    // Revert
    btn.dataset.bookmarked = isBookmarked ? '1' : '0';
    btn.classList.toggle('bookmarked', isBookmarked);
    btn.setAttribute('aria-pressed', String(isBookmarked));
    btn.setAttribute('aria-label', (isBookmarked ? 'Remove bookmark' : 'Bookmark') + ' post');
    if (svgPath) svgPath.setAttribute('fill', isBookmarked ? 'currentColor' : 'none');
    showToast(err.message || 'Could not update bookmark', 'error');
  }
}

// ─── Share / Copy link ────────────────────────────────────────────────────────

function handleShare(postId) {
  const url = `${window.location.origin}/index.html?post=${postId}`;
  if (navigator.clipboard) {
    navigator.clipboard.writeText(url).then(() => showToast('Link copied!', 'info'));
  } else {
    showToast('Copy: ' + url, 'info');
  }
}

// ─── Delete post ──────────────────────────────────────────────────────────────

async function handleDeletePost(postId, postCard) {
  const confirmed = await confirmDelete('Delete this post? This cannot be undone.');
  if (!confirmed) return;

  try {
    await apiFetch(`posts/${postId}`, { method: 'DELETE' });
    if (postCard) {
      postCard.style.transition = 'opacity 0.3s ease';
      postCard.style.opacity = '0';
      setTimeout(() => postCard.remove(), 300);
    }
    showToast('Post deleted', 'info');
  } catch (err) {
    showToast(err.message || 'Could not delete post', 'error');
  }
}

// ─── Edit post modal ──────────────────────────────────────────────────────────

function openEditModal(postId, postCard) {
  const overlay = document.getElementById('edit-post-modal-overlay');
  const idInput = document.getElementById('edit-post-id');
  const contentEl = document.getElementById('edit-post-content');

  if (!overlay) return;

  // Prefill from DOM
  const contentNode = postCard && postCard.querySelector('.post-content');
  const existingContent = contentNode ? contentNode.textContent : '';

  idInput.value = postId;
  contentEl.value = existingContent;
  overlay.classList.remove('hidden');
  contentEl.focus();
}

document.addEventListener('DOMContentLoaded', () => {
  const overlay  = document.getElementById('edit-post-modal-overlay');
  const closeBtn = document.getElementById('edit-post-modal-close');
  const cancelBtn = document.getElementById('edit-post-cancel');
  const form = document.getElementById('edit-post-form');

  if (!overlay || !form) return;

  function closeEditModal() { overlay.classList.add('hidden'); }

  closeBtn && closeBtn.addEventListener('click', closeEditModal);
  cancelBtn && cancelBtn.addEventListener('click', closeEditModal);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) closeEditModal(); });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const postId  = document.getElementById('edit-post-id').value;
    const content = document.getElementById('edit-post-content').value.trim();
    const submitBtn = document.getElementById('edit-post-submit');
    const btnText   = document.getElementById('edit-post-btn-text');
    const spinner   = document.getElementById('edit-post-spinner');

    if (!content) { showToast('Post content cannot be empty', 'error'); return; }

    submitBtn.disabled = true;
    btnText.style.opacity = '0.6';
    spinner.classList.remove('hidden');

    try {
      const json = await apiFetch(`posts/${postId}`, {
        method: 'PUT',
        body: JSON.stringify({ content })
      });

      // Update the post card in DOM
      const postCard = document.querySelector(`.post-card[data-post-id="${postId}"]`);
      if (postCard) {
        const contentNode = postCard.querySelector('.post-content');
        if (contentNode) contentNode.textContent = json.data.content;
      }

      closeEditModal();
      showToast('Post updated', 'info');
    } catch (err) {
      showToast(err.message || 'Could not update post', 'error');
    } finally {
      submitBtn.disabled = false;
      btnText.style.opacity = '1';
      spinner.classList.add('hidden');
    }
  });
});

// ─── Comments modal ───────────────────────────────────────────────────────────

async function openCommentsModal(postId) {
  _activeCommentPostId = postId;
  const overlay = document.getElementById('comments-modal-overlay');
  const listEl  = document.getElementById('comments-list');

  if (!overlay || !listEl) return;

  overlay.classList.remove('hidden');
  listEl.innerHTML = `<div class="loading-state"><span class="spinner"></span></div>`;

  await loadComments(postId);
}

async function loadComments(postId) {
  const listEl = document.getElementById('comments-list');
  if (!listEl) return;

  try {
    const json = await apiFetch(`comments/posts/${postId}`);
    const comments = json.data || [];

    if (comments.length === 0) {
      listEl.innerHTML = `<p class="text-muted text-sm" style="text-align:center;padding:var(--space-6)">No comments yet. Be the first!</p>`;
      return;
    }

    listEl.innerHTML = comments.map(renderComment).join('');
    // Scroll to bottom of comments
    listEl.scrollTop = listEl.scrollHeight;
  } catch (err) {
    listEl.innerHTML = `<p class="text-muted text-sm" style="text-align:center">Could not load comments.</p>`;
  }
}

function renderComment(comment) {
  const currentUser = window._currentUser;
  const isOwn = currentUser && (currentUser.id === comment.user_id);

  const avatarHtml = renderAvatar(
    { full_name: comment.full_name, username: comment.username, avatar: comment.avatar },
    'xs'
  );

  const deleteBtn = isOwn
    ? `<button class="btn-icon" style="margin-left:auto;flex-shrink:0"
         data-action="delete-comment" data-comment-id="${comment.id}"
         aria-label="Delete comment">
         <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none"
           stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" aria-hidden="true">
           <polyline points="3 6 5 6 21 6"/>
           <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
         </svg>
       </button>`
    : '';

  return `
    <div class="comment-item" data-comment-id="${comment.id}"
      style="display:flex;gap:var(--space-2);margin-bottom:var(--space-4);align-items:flex-start">
      <a href="/profile.html?user=${encodeURIComponent(comment.username)}" aria-label="${escapeHtml(comment.full_name)}'s profile">
        ${avatarHtml}
      </a>
      <div style="flex:1">
        <div style="display:flex;align-items:center;gap:var(--space-2);flex-wrap:wrap">
          <a href="/profile.html?user=${encodeURIComponent(comment.username)}"
            style="font-weight:600;font-size:var(--font-size-sm);color:var(--color-text)">
            ${escapeHtml(comment.full_name || comment.username)}
          </a>
          <span style="font-size:var(--font-size-xs);color:var(--color-text-muted)">
            @${escapeHtml(comment.username)} · ${formatTimeAgo(comment.created_at)}
          </span>
          ${deleteBtn}
        </div>
        <p style="font-size:var(--font-size-sm);margin-top:2px;word-break:break-word">${escapeHtml(comment.content)}</p>
      </div>
    </div>`;
}

// Wire comment modal close + submit
document.addEventListener('DOMContentLoaded', () => {
  const overlay  = document.getElementById('comments-modal-overlay');
  const closeBtn = document.getElementById('comments-modal-close');
  const form     = document.getElementById('comment-form');
  const listEl   = document.getElementById('comments-list');

  if (!overlay) return;

  function closeModal() {
    overlay.classList.add('hidden');
    _activeCommentPostId = null;
    const input = document.getElementById('comment-input');
    if (input) input.value = '';
  }

  closeBtn && closeBtn.addEventListener('click', closeModal);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) closeModal(); });

  // Delete comment via event delegation on list
  listEl && listEl.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-action="delete-comment"]');
    if (!btn) return;
    const commentId = btn.dataset.commentId;
    const confirmed = await confirmDelete('Delete this comment?');
    if (!confirmed) return;
    try {
      await apiFetch(`comments/${commentId}`, { method: 'DELETE' });
      const item = listEl.querySelector(`[data-comment-id="${commentId}"]`);
      if (item) item.remove();
      // Update comment count on post card
      if (_activeCommentPostId) {
        updateCommentCount(_activeCommentPostId, -1);
      }
    } catch (err) {
      showToast(err.message || 'Could not delete comment', 'error');
    }
  });

  form && form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const content = document.getElementById('comment-input').value.trim();
    if (!content) { showToast('Comment cannot be empty', 'error'); return; }
    if (!_activeCommentPostId) return;

    const submitBtn = document.getElementById('comment-submit-btn');
    const btnText   = document.getElementById('comment-btn-text');
    const spinner   = document.getElementById('comment-spinner');

    submitBtn.disabled = true;
    btnText.style.opacity = '0.6';
    spinner.classList.remove('hidden');

    try {
      const json = await apiFetch(`comments/posts/${_activeCommentPostId}`, {
        method: 'POST',
        body: JSON.stringify({ content })
      });

      const comment = json.data;
      document.getElementById('comment-input').value = '';

      // Append comment to list
      const emptyMsg = listEl.querySelector('p.text-muted');
      if (emptyMsg) emptyMsg.remove();

      const div = document.createElement('div');
      div.innerHTML = renderComment(comment);
      listEl.appendChild(div.firstElementChild);
      listEl.scrollTop = listEl.scrollHeight;

      // Update comment count on post card
      updateCommentCount(_activeCommentPostId, 1);
    } catch (err) {
      showToast(err.message || 'Could not add comment', 'error');
    } finally {
      submitBtn.disabled = false;
      btnText.style.opacity = '1';
      spinner.classList.add('hidden');
    }
  });
});

// ─── Helpers to update post card counts ──────────────────────────────────────

function updatePostStats(postCard, likeCount, commentCount) {
  if (!postCard) return;
  const statsEl = postCard.querySelector('.post-stats');
  if (!statsEl) return;
  const spans = statsEl.querySelectorAll('span');
  if (likeCount !== null && spans[0]) {
    spans[0].textContent = `${likeCount} like${likeCount === 1 ? '' : 's'}`;
  }
  if (commentCount !== null && spans[1]) {
    spans[1].textContent = `${commentCount} comment${commentCount === 1 ? '' : 's'}`;
  }
}

function updateCommentCount(postId, delta) {
  const postCard = document.querySelector(`.post-card[data-post-id="${postId}"]`);
  if (!postCard) return;

  const commentBtn = postCard.querySelector('.comment-btn');
  const countEl = commentBtn && commentBtn.querySelector('.comment-count');
  if (countEl) {
    const current = parseInt(countEl.textContent, 10) || 0;
    const newCount = Math.max(0, current + delta);
    countEl.textContent = newCount;
    updatePostStats(postCard, null, newCount);
  }
}

// ─── Post composer ────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  const form        = document.getElementById('post-form');
  const contentEl   = document.getElementById('post-content');
  const imageInput  = document.getElementById('post-image-input');
  const previewWrap = document.getElementById('image-preview-wrap');
  const previewImg  = document.getElementById('image-preview');
  const removeBtn   = document.getElementById('remove-image-btn');
  const charCount   = document.getElementById('char-count');
  const feedList    = document.getElementById('feed-list');

  if (!form) return;

  // Character counter
  contentEl && contentEl.addEventListener('input', () => {
    const remaining = 500 - contentEl.value.length;
    if (charCount) {
      charCount.textContent = remaining;
      charCount.style.color = remaining < 50 ? 'var(--color-error)' : '';
    }
  });

  // Image preview
  imageInput && imageInput.addEventListener('change', () => {
    const file = imageInput.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      previewImg.src = ev.target.result;
      previewWrap.classList.remove('hidden');
    };
    reader.readAsDataURL(file);
  });

  // Remove image
  removeBtn && removeBtn.addEventListener('click', () => {
    imageInput.value = '';
    previewImg.src = '';
    previewWrap.classList.add('hidden');
  });

  // Submit post
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const content = contentEl.value.trim();
    if (!content) { showToast('Post content cannot be empty', 'error'); return; }

    const submitBtn = document.getElementById('post-submit-btn');
    const btnText   = document.getElementById('post-btn-text');
    const spinner   = document.getElementById('post-spinner');

    submitBtn.disabled = true;
    btnText.style.opacity = '0.6';
    spinner.classList.remove('hidden');

    try {
      const formData = new FormData();
      formData.append('content', content);
      if (imageInput && imageInput.files[0]) {
        formData.append('image', imageInput.files[0]);
      }

      const json = await apiFetch('posts', { method: 'POST', body: formData });

      const newPost = json.data;

      // Prepend to feed
      if (feedList) {
        const empty = feedList.querySelector('.empty-state');
        if (empty) empty.remove();

        const div = document.createElement('div');
        div.innerHTML = renderPost(newPost);
        feedList.insertBefore(div.firstElementChild, feedList.firstChild);
      }

      // Reset form
      contentEl.value = '';
      if (charCount) charCount.textContent = '500';
      imageInput && (imageInput.value = '');
      previewImg && (previewImg.src = '');
      previewWrap && previewWrap.classList.add('hidden');

      showToast('Post created!', 'info');
    } catch (err) {
      showToast(err.message || 'Could not create post', 'error');
    } finally {
      submitBtn.disabled = false;
      btnText.style.opacity = '1';
      spinner.classList.add('hidden');
    }
  });
});

// ─── Suggested users ──────────────────────────────────────────────────────────

async function loadSuggestions() {
  const listEl = document.getElementById('suggestions-list');
  if (!listEl) return;

  try {
    const json = await apiFetch('users/suggestions');
    const users = (json.data || []).slice(0, 5);

    if (users.length === 0) {
      listEl.innerHTML = `<p class="text-sm text-muted">No suggestions right now.</p>`;
      return;
    }

    listEl.innerHTML = users.map(u => {
      const avatar = renderAvatar({ full_name: u.full_name, username: u.username, avatar: u.avatar }, 'sm');
      return `
        <div class="suggested-user">
          <a href="/profile.html?user=${encodeURIComponent(u.username)}" aria-label="${escapeHtml(u.full_name || u.username)}'s profile">
            ${avatar}
          </a>
          <div class="suggested-user-info">
            <a href="/profile.html?user=${encodeURIComponent(u.username)}" class="suggested-user-name" style="color:var(--color-text)">
              ${escapeHtml(u.full_name || u.username)}
            </a>
            <div class="suggested-user-handle">@${escapeHtml(u.username)}</div>
          </div>
          <button class="btn btn-secondary btn-sm follow-btn" data-user-id="${u.id}" aria-label="Follow ${escapeHtml(u.username)}">
            Follow
          </button>
        </div>`;
    }).join('');

    // Wire follow buttons
    listEl.querySelectorAll('.follow-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const userId = btn.dataset.userId;
        btn.disabled = true;
        try {
          await apiFetch(`follows/${userId}`, { method: 'POST' });
          btn.textContent = 'Following';
          btn.classList.remove('btn-secondary');
          btn.classList.add('btn-ghost');
          showToast('Now following!', 'info');
        } catch (err) {
          btn.disabled = false;
          showToast(err.message || 'Could not follow user', 'error');
        }
      });
    });
  } catch {
    listEl.innerHTML = `<p class="text-sm text-muted">Could not load suggestions.</p>`;
  }
}

// ─── Bootstrap ────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  loadFeed();
  loadSuggestions();
});
