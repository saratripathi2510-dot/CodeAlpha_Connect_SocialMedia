/**
 * profile.js — profile page logic.
 *
 * Depends on app.js being loaded first (apiFetch, showToast, formatTimeAgo,
 * renderAvatar, confirmDelete, escapeHtml, _currentUser).
 *
 * URL param: ?user=username  (if absent, loads logged-in user's own profile)
 */

'use strict';

// ─── State ────────────────────────────────────────────────────────────────────

let _profileUser = null;   // Full user object from /api/users/:username
let _currentTab  = 'posts';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getProfileUsername() {
  const params = new URLSearchParams(window.location.search);
  return params.get('user') || null;
}

function isOwnProfile() {
  if (!window._currentUser || !_profileUser) return false;
  return window._currentUser.id === _profileUser.id ||
         window._currentUser.username === _profileUser.username;
}

// ─── Render profile header ────────────────────────────────────────────────────

function renderProfileHeader(user) {
  const wrap = document.getElementById('profile-header-wrap');
  if (!wrap) return;

  const coverHtml = user.cover_image
    ? `<img src="${escapeHtml(user.cover_image)}" alt="Cover image" />`
    : `<div class="profile-cover-placeholder"></div>`;

  const avatarHtml = user.avatar
    ? `<img src="${escapeHtml(user.avatar)}" alt="${escapeHtml(user.full_name)}'s avatar" style="width:100%;height:100%;object-fit:cover" />`
    : (function() {
        const initials = (user.full_name || user.username || '?')
          .split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
        return `<span class="avatar-placeholder avatar-xl" style="width:100%;height:100%;border:none;font-size:var(--font-size-2xl)">${escapeHtml(initials)}</span>`;
      })();

  const own = isOwnProfile();

  const actionBtn = own
    ? `<button class="btn btn-secondary btn-sm" id="edit-profile-btn" aria-label="Edit your profile">
         <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none"
           stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" aria-hidden="true">
           <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
           <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
         </svg>
         Edit Profile
       </button>`
    : `<div style="display:flex;gap:var(--space-2)">
         <button
           class="btn btn-sm ${user.is_following ? 'btn-ghost' : 'btn-primary'}"
           id="follow-btn"
           data-user-id="${user.id}"
           data-following="${user.is_following ? '1' : '0'}"
           aria-label="${user.is_following ? 'Unfollow' : 'Follow'} ${escapeHtml(user.username)}"
           aria-pressed="${user.is_following}"
         >
           ${user.is_following ? 'Following' : 'Follow'}
         </button>
         <a href="/messages.html?user=${encodeURIComponent(user.username)}"
           class="btn btn-secondary btn-sm"
           aria-label="Message ${escapeHtml(user.username)}">
           <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none"
             stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" aria-hidden="true">
             <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
           </svg>
           Message
         </a>
       </div>`;

  const locationHtml = user.location
    ? `<span class="profile-meta-item">
         <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="none"
           stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" aria-hidden="true">
           <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
           <circle cx="12" cy="10" r="3"/>
         </svg>
         ${escapeHtml(user.location)}
       </span>` : '';

  const websiteHtml = user.website
    ? `<span class="profile-meta-item">
         <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="none"
           stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" aria-hidden="true">
           <circle cx="12" cy="12" r="10"/>
           <line x1="2" y1="12" x2="22" y2="12"/>
           <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
         </svg>
         <a href="${escapeHtml(user.website)}" target="_blank" rel="noopener noreferrer">
           ${escapeHtml(user.website.replace(/^https?:\/\//, ''))}
         </a>
       </span>` : '';

  const joinHtml = user.created_at
    ? `<span class="profile-meta-item">
         <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="none"
           stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" aria-hidden="true">
           <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
           <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/>
           <line x1="3" y1="10" x2="21" y2="10"/>
         </svg>
         Joined ${new Date(user.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
       </span>` : '';

  wrap.innerHTML = `
    <div class="card" style="overflow:visible;margin-bottom:var(--space-4)">
      <div class="profile-cover">${coverHtml}</div>
      <div class="profile-info-section">
        <div class="profile-avatar-row">
          <div class="profile-avatar-outer">${avatarHtml}</div>
          <div>${actionBtn}</div>
        </div>
        <h1 class="profile-name">${escapeHtml(user.full_name || user.username)}</h1>
        <p class="profile-handle">@${escapeHtml(user.username)}</p>
        ${user.bio ? `<p class="profile-bio">${escapeHtml(user.bio)}</p>` : ''}
        ${(locationHtml || websiteHtml || joinHtml)
          ? `<div class="profile-meta">${locationHtml}${websiteHtml}${joinHtml}</div>`
          : ''}
        <div class="profile-stats">
          <button class="profile-stat-btn" data-tab="posts" aria-label="${user.post_count} posts">
            <span class="profile-stat-count" id="stat-posts">${user.post_count || 0}</span>
            <span class="profile-stat-label">Posts</span>
          </button>
          <button class="profile-stat-btn" data-tab="followers" aria-label="${user.follower_count} followers">
            <span class="profile-stat-count" id="stat-followers">${user.follower_count || 0}</span>
            <span class="profile-stat-label">Followers</span>
          </button>
          <button class="profile-stat-btn" data-tab="following" aria-label="${user.following_count} following">
            <span class="profile-stat-count" id="stat-following">${user.following_count || 0}</span>
            <span class="profile-stat-label">Following</span>
          </button>
        </div>
      </div>
    </div>`;

  // Wire stat buttons → tabs
  wrap.querySelectorAll('.profile-stat-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const tab = btn.dataset.tab;
      switchTab(tab);
    });
  });

  // Wire follow/unfollow button
  const followBtn = document.getElementById('follow-btn');
  if (followBtn) {
    followBtn.addEventListener('click', handleFollowToggle);
  }

  // Wire edit profile button
  const editBtn = document.getElementById('edit-profile-btn');
  if (editBtn) {
    editBtn.addEventListener('click', openEditModal);
  }
}

// ─── Follow / Unfollow ────────────────────────────────────────────────────────

async function handleFollowToggle() {
  const btn = document.getElementById('follow-btn');
  if (!btn || !_profileUser) return;

  const isFollowing = btn.dataset.following === '1';
  const method = isFollowing ? 'DELETE' : 'POST';

  btn.disabled = true;

  try {
    const json = await apiFetch(`follows/${_profileUser.id}`, { method });
    const { following, follower_count } = json.data;

    btn.dataset.following = following ? '1' : '0';
    btn.setAttribute('aria-pressed', String(following));
    btn.textContent = following ? 'Following' : 'Follow';
    btn.className = `btn btn-sm ${following ? 'btn-ghost' : 'btn-primary'}`;
    btn.setAttribute('aria-label', `${following ? 'Unfollow' : 'Follow'} ${escapeHtml(_profileUser.username)}`);

    // Update follower count
    const statEl = document.getElementById('stat-followers');
    if (statEl) statEl.textContent = follower_count;
    _profileUser.follower_count = follower_count;
    _profileUser.is_following = following;

    showToast(following ? `Following @${_profileUser.username}` : `Unfollowed @${_profileUser.username}`, 'info');
  } catch (err) {
    showToast(err.message || 'Could not update follow', 'error');
  } finally {
    btn.disabled = false;
  }
}

// ─── Tab switching ────────────────────────────────────────────────────────────

async function switchTab(tab) {
  _currentTab = tab;

  // Update tab UI
  document.querySelectorAll('.profile-tab').forEach(t => {
    const isActive = t.dataset.tab === tab;
    t.classList.toggle('active', isActive);
    t.setAttribute('aria-selected', String(isActive));
  });

  const contentEl = document.getElementById('profile-content');
  if (!contentEl) return;

  contentEl.innerHTML = `<div class="loading-state"><span class="spinner"></span></div>`;

  if (tab === 'posts') {
    await loadProfilePosts();
  } else if (tab === 'followers') {
    await loadFollowers();
  } else if (tab === 'following') {
    await loadFollowing();
  }
}

// ─── Load posts ───────────────────────────────────────────────────────────────

async function loadProfilePosts() {
  const contentEl = document.getElementById('profile-content');
  if (!contentEl || !_profileUser) return;

  try {
    const json = await apiFetch(`users/${encodeURIComponent(_profileUser.username)}/posts`);
    const posts = json.data || [];

    if (posts.length === 0) {
      contentEl.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon" aria-hidden="true">✦</div>
          <h3>No posts yet</h3>
          <p>${isOwnProfile() ? "You haven't posted anything yet." : `${escapeHtml(_profileUser.full_name || _profileUser.username)} hasn't posted yet.`}</p>
        </div>`;
      return;
    }

    contentEl.innerHTML = posts.map(renderProfilePost).join('');
  } catch (err) {
    contentEl.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon" aria-hidden="true">⚠</div>
        <h3>Could not load posts</h3>
        <p>${escapeHtml(err.message || 'Please try again.')}</p>
      </div>`;
  }
}

function renderProfilePost(post) {
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
             <button class="dropdown-item danger" data-profile-action="delete-post" data-post-id="${post.id}">
               <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none"
                 stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" aria-hidden="true">
                 <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
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
        <a class="post-author" href="/profile.html?user=${encodeURIComponent(post.username)}">
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
      <div class="post-stats">
        <span>${post.like_count || 0} like${post.like_count === 1 ? '' : 's'}</span>
        <span>${post.comment_count || 0} comment${post.comment_count === 1 ? '' : 's'}</span>
      </div>
      <div class="post-actions" role="group" aria-label="Post actions">
        <button class="post-action-btn like-btn${liked ? ' liked' : ''}"
          data-profile-action="like" data-post-id="${post.id}"
          data-liked="${liked ? '1' : '0'}"
          aria-label="${liked ? 'Unlike' : 'Like'} post" aria-pressed="${liked}">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18"
            fill="${liked ? 'currentColor' : 'none'}"
            stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
          </svg>
          <span class="like-count">${post.like_count || 0}</span>
        </button>
        <button class="post-action-btn bookmark-btn${bookmarked ? ' bookmarked' : ''}"
          data-profile-action="bookmark" data-post-id="${post.id}"
          data-bookmarked="${bookmarked ? '1' : '0'}"
          aria-label="${bookmarked ? 'Remove bookmark' : 'Bookmark'}" aria-pressed="${bookmarked}">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18"
            fill="${bookmarked ? 'currentColor' : 'none'}"
            stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
          </svg>
        </button>
      </div>
    </article>`;
}

// ─── Load followers / following ───────────────────────────────────────────────

async function loadFollowers() {
  const contentEl = document.getElementById('profile-content');
  if (!contentEl || !_profileUser) return;

  try {
    const json = await apiFetch(`users/${encodeURIComponent(_profileUser.username)}/followers`);
    const users = json.data || [];
    renderUserList(contentEl, users, 'No followers yet.');
  } catch (err) {
    contentEl.innerHTML = `<div class="empty-state"><h3>Could not load followers</h3></div>`;
  }
}

async function loadFollowing() {
  const contentEl = document.getElementById('profile-content');
  if (!contentEl || !_profileUser) return;

  try {
    const json = await apiFetch(`users/${encodeURIComponent(_profileUser.username)}/following`);
    const users = json.data || [];
    renderUserList(contentEl, users, 'Not following anyone yet.');
  } catch (err) {
    contentEl.innerHTML = `<div class="empty-state"><h3>Could not load following</h3></div>`;
  }
}

function renderUserList(container, users, emptyMsg) {
  if (users.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon" aria-hidden="true">👥</div>
        <h3>${emptyMsg}</h3>
      </div>`;
    return;
  }

  container.innerHTML = `<div class="card" style="padding:var(--space-4)">
    ${users.map(u => {
      const avatar = renderAvatar({ full_name: u.full_name, username: u.username, avatar: u.avatar }, 'sm');
      const currentUser = window._currentUser;
      const isSelf = currentUser && currentUser.id === u.id;
      const isFollowing = !!u.is_following;

      const followBtn = (!isSelf)
        ? `<button class="btn btn-sm ${isFollowing ? 'btn-ghost' : 'btn-secondary'} follow-list-btn"
             data-user-id="${u.id}" data-following="${isFollowing ? '1' : '0'}"
             aria-label="${isFollowing ? 'Unfollow' : 'Follow'} ${escapeHtml(u.username)}">
             ${isFollowing ? 'Following' : 'Follow'}
           </button>` : '';

      return `<div class="user-list-card">
        <a href="/profile.html?user=${encodeURIComponent(u.username)}" aria-label="${escapeHtml(u.full_name || u.username)}'s profile">
          ${avatar}
        </a>
        <div class="user-list-info">
          <a class="user-list-name" href="/profile.html?user=${encodeURIComponent(u.username)}">
            ${escapeHtml(u.full_name || u.username)}
          </a>
          <div class="user-list-handle">@${escapeHtml(u.username)}</div>
        </div>
        ${followBtn}
      </div>`;
    }).join('')}
  </div>`;

  // Wire follow buttons in the list
  container.querySelectorAll('.follow-list-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const userId = btn.dataset.userId;
      const isFollowing = btn.dataset.following === '1';
      const method = isFollowing ? 'DELETE' : 'POST';
      btn.disabled = true;
      try {
        const json = await apiFetch(`follows/${userId}`, { method });
        const { following } = json.data;
        btn.dataset.following = following ? '1' : '0';
        btn.textContent = following ? 'Following' : 'Follow';
        btn.className = `btn btn-sm ${following ? 'btn-ghost' : 'btn-secondary'} follow-list-btn`;
        btn.disabled = false;
      } catch (err) {
        btn.disabled = false;
        showToast(err.message || 'Could not update follow', 'error');
      }
    });
  });
}

// ─── Event delegation for post actions in profile content ────────────────────

document.addEventListener('DOMContentLoaded', () => {
  const contentEl = document.getElementById('profile-content');
  if (!contentEl) return;

  // Use capture on parent to handle dynamically rendered posts
  document.getElementById('main-content').addEventListener('click', async (e) => {
    // Dropdown toggle
    const moreToggle = e.target.closest('[data-more-toggle]');
    if (moreToggle) {
      e.stopPropagation();
      const dropdown = moreToggle.closest('[data-dropdown]');
      const menu = dropdown && dropdown.querySelector('.dropdown-menu');
      if (menu) {
        const isOpen = !menu.classList.contains('hidden');
        document.querySelectorAll('.dropdown-menu:not(.hidden)').forEach(m => m.classList.add('hidden'));
        if (!isOpen) menu.classList.remove('hidden');
      }
      return;
    }

    const actionBtn = e.target.closest('[data-profile-action]');
    if (!actionBtn) {
      document.querySelectorAll('.dropdown-menu:not(.hidden)').forEach(m => m.classList.add('hidden'));
      return;
    }

    const action = actionBtn.dataset.profileAction;
    const postId = actionBtn.dataset.postId;
    const postCard = actionBtn.closest('.post-card');

    if (action === 'like') {
      await handleProfileLike(actionBtn, postId, postCard);
    } else if (action === 'bookmark') {
      await handleProfileBookmark(actionBtn, postId);
    } else if (action === 'delete-post') {
      document.querySelectorAll('.dropdown-menu:not(.hidden)').forEach(m => m.classList.add('hidden'));
      await handleProfileDeletePost(postId, postCard);
    }
  });
});

async function handleProfileLike(btn, postId, postCard) {
  const isLiked = btn.dataset.liked === '1';
  const method  = isLiked ? 'DELETE' : 'POST';
  const countEl = btn.querySelector('.like-count');
  const svgPath = btn.querySelector('svg path');
  const current = parseInt(countEl.textContent, 10) || 0;
  const newCount = isLiked ? Math.max(0, current - 1) : current + 1;

  btn.dataset.liked = isLiked ? '0' : '1';
  btn.classList.toggle('liked', !isLiked);
  btn.setAttribute('aria-pressed', String(!isLiked));
  if (svgPath) svgPath.setAttribute('fill', !isLiked ? 'currentColor' : 'none');
  countEl.textContent = newCount;

  try {
    const json = await apiFetch(`likes/posts/${postId}`, { method });
    countEl.textContent = json.data.like_count;
    const statSpan = postCard && postCard.querySelector('.post-stats span:first-child');
    if (statSpan) statSpan.textContent = `${json.data.like_count} like${json.data.like_count === 1 ? '' : 's'}`;
  } catch (err) {
    // Revert
    btn.dataset.liked = isLiked ? '1' : '0';
    btn.classList.toggle('liked', isLiked);
    btn.setAttribute('aria-pressed', String(isLiked));
    if (svgPath) svgPath.setAttribute('fill', isLiked ? 'currentColor' : 'none');
    countEl.textContent = current;
    showToast(err.message || 'Could not update like', 'error');
  }
}

async function handleProfileBookmark(btn, postId) {
  const isBookmarked = btn.dataset.bookmarked === '1';
  const method = isBookmarked ? 'DELETE' : 'POST';
  btn.dataset.bookmarked = isBookmarked ? '0' : '1';
  btn.classList.toggle('bookmarked', !isBookmarked);
  const svgPath = btn.querySelector('svg path');
  if (svgPath) svgPath.setAttribute('fill', !isBookmarked ? 'currentColor' : 'none');

  try {
    await apiFetch(`bookmarks/posts/${postId}`, { method });
    showToast(isBookmarked ? 'Bookmark removed' : 'Post bookmarked', 'info');
  } catch (err) {
    btn.dataset.bookmarked = isBookmarked ? '1' : '0';
    btn.classList.toggle('bookmarked', isBookmarked);
    if (svgPath) svgPath.setAttribute('fill', isBookmarked ? 'currentColor' : 'none');
    showToast(err.message || 'Could not update bookmark', 'error');
  }
}

async function handleProfileDeletePost(postId, postCard) {
  const confirmed = await confirmDelete('Delete this post? This cannot be undone.');
  if (!confirmed) return;

  try {
    await apiFetch(`posts/${postId}`, { method: 'DELETE' });
    if (postCard) {
      postCard.style.transition = 'opacity 0.3s ease';
      postCard.style.opacity = '0';
      setTimeout(() => {
        postCard.remove();
        // Update post count
        const statEl = document.getElementById('stat-posts');
        if (statEl) {
          const current = parseInt(statEl.textContent, 10) || 1;
          statEl.textContent = Math.max(0, current - 1);
        }
      }, 300);
    }
    showToast('Post deleted', 'info');
  } catch (err) {
    showToast(err.message || 'Could not delete post', 'error');
  }
}

// ─── Edit profile modal ───────────────────────────────────────────────────────

function openEditModal() {
  if (!_profileUser) return;

  const modal = document.getElementById('edit-profile-modal');
  if (!modal) return;

  // Pre-fill fields
  document.getElementById('edit-full-name').value = _profileUser.full_name || '';
  document.getElementById('edit-bio').value       = _profileUser.bio || '';
  document.getElementById('edit-location').value  = _profileUser.location || '';
  document.getElementById('edit-website').value   = _profileUser.website || '';

  // Cover preview
  const coverWrap = document.getElementById('cover-preview-wrap');
  if (coverWrap) {
    if (_profileUser.cover_image) {
      coverWrap.innerHTML = `<img src="${escapeHtml(_profileUser.cover_image)}" alt="Cover" class="cover-preview" />`;
    } else {
      coverWrap.innerHTML = `<div style="width:100%;height:80px;background:var(--color-surface);border-radius:var(--radius-md);border:1px dashed var(--color-border);display:flex;align-items:center;justify-content:center;color:var(--color-text-muted);font-size:var(--font-size-xs)">No cover image</div>`;
    }
  }

  // Avatar preview
  const avatarWrap = document.getElementById('avatar-preview-wrap');
  if (avatarWrap) {
    if (_profileUser.avatar) {
      avatarWrap.innerHTML = `<img src="${escapeHtml(_profileUser.avatar)}" alt="Avatar" style="width:100%;height:100%;object-fit:cover" />`;
    } else {
      const initials = (_profileUser.full_name || _profileUser.username || '?')
        .split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
      avatarWrap.innerHTML = `<span class="avatar-placeholder" style="width:100%;height:100%;border-radius:50%;border:none;font-size:var(--font-size-base)">${escapeHtml(initials)}</span>`;
    }
  }

  modal.classList.remove('hidden');

  // Live preview for avatar file
  const avatarInput = document.getElementById('avatar-file-input');
  if (avatarInput) {
    avatarInput.onchange = () => {
      const file = avatarInput.files[0];
      if (file && avatarWrap) {
        const reader = new FileReader();
        reader.onload = (ev) => {
          avatarWrap.innerHTML = `<img src="${ev.target.result}" alt="Avatar preview" style="width:100%;height:100%;object-fit:cover" />`;
        };
        reader.readAsDataURL(file);
      }
    };
  }

  // Live preview for cover file
  const coverInput = document.getElementById('cover-file-input');
  if (coverInput) {
    coverInput.onchange = () => {
      const file = coverInput.files[0];
      if (file && coverWrap) {
        const reader = new FileReader();
        reader.onload = (ev) => {
          coverWrap.innerHTML = `<img src="${ev.target.result}" alt="Cover preview" class="cover-preview" />`;
        };
        reader.readAsDataURL(file);
      }
    };
  }
}

function closeEditModal() {
  const modal = document.getElementById('edit-profile-modal');
  if (modal) modal.classList.add('hidden');
}

// Wire edit modal controls
document.addEventListener('DOMContentLoaded', () => {
  const modal    = document.getElementById('edit-profile-modal');
  const closeBtn = document.getElementById('edit-profile-close');
  const cancelBtn = document.getElementById('edit-profile-cancel');
  const form     = document.getElementById('edit-profile-form');

  if (!modal || !form) return;

  closeBtn  && closeBtn.addEventListener('click',  closeEditModal);
  cancelBtn && cancelBtn.addEventListener('click', closeEditModal);
  modal.addEventListener('click', (e) => { if (e.target === modal) closeEditModal(); });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const submitBtn = document.getElementById('edit-profile-submit');
    const btnText   = document.getElementById('edit-profile-btn-text');
    const spinner   = document.getElementById('edit-profile-spinner');

    submitBtn.disabled = true;
    if (btnText) btnText.style.opacity = '0.6';
    if (spinner) spinner.classList.remove('hidden');

    try {
      const formData = new FormData();
      formData.append('full_name', document.getElementById('edit-full-name').value.trim());
      formData.append('bio',       document.getElementById('edit-bio').value);
      formData.append('location',  document.getElementById('edit-location').value);
      formData.append('website',   document.getElementById('edit-website').value);

      const avatarFile = document.getElementById('avatar-file-input').files[0];
      const coverFile  = document.getElementById('cover-file-input').files[0];
      if (avatarFile) formData.append('avatar', avatarFile);
      if (coverFile)  formData.append('cover',  coverFile);

      const json = await apiFetch('users/me', { method: 'PUT', body: formData });
      const updated = json.data;

      // Update local state and localStorage
      _profileUser = { ..._profileUser, ...updated };
      setCurrentUser(updated);
      window._currentUser = { ...window._currentUser, ...updated };

      // Re-render header with fresh data
      renderProfileHeader(_profileUser);

      closeEditModal();
      showToast('Profile updated!', 'info');
    } catch (err) {
      showToast(err.message || 'Could not update profile', 'error');
    } finally {
      submitBtn.disabled = false;
      if (btnText) btnText.style.opacity = '1';
      if (spinner) spinner.classList.add('hidden');
    }
  });
});

// ─── Tab wiring ───────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  const tabsWrap = document.getElementById('profile-tabs-wrap');
  if (!tabsWrap) return;

  tabsWrap.addEventListener('click', (e) => {
    const tabBtn = e.target.closest('.profile-tab');
    if (!tabBtn) return;
    switchTab(tabBtn.dataset.tab);
  });
});

// ─── Suggestions sidebar ──────────────────────────────────────────────────────

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
          <a href="/profile.html?user=${encodeURIComponent(u.username)}">${avatar}</a>
          <div class="suggested-user-info">
            <a href="/profile.html?user=${encodeURIComponent(u.username)}" class="suggested-user-name" style="color:var(--color-text)">
              ${escapeHtml(u.full_name || u.username)}
            </a>
            <div class="suggested-user-handle">@${escapeHtml(u.username)}</div>
          </div>
          <button class="btn btn-secondary btn-sm follow-suggest-btn" data-user-id="${u.id}">Follow</button>
        </div>`;
    }).join('');

    listEl.querySelectorAll('.follow-suggest-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        btn.disabled = true;
        try {
          await apiFetch(`follows/${btn.dataset.userId}`, { method: 'POST' });
          btn.textContent = 'Following';
          btn.classList.remove('btn-secondary');
          btn.classList.add('btn-ghost');
        } catch (err) {
          btn.disabled = false;
          showToast(err.message || 'Could not follow', 'error');
        }
      });
    });
  } catch {
    listEl.innerHTML = `<p class="text-sm text-muted">Could not load suggestions.</p>`;
  }
}

// ─── Bootstrap ────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', async () => {
  // Wait for app.js checkAuth to complete (it's also DOMContentLoaded)
  // We wait for _currentUser to be set, then load profile
  const waitForUser = () => new Promise((resolve) => {
    if (window._currentUser) { resolve(); return; }
    const id = setInterval(() => {
      if (window._currentUser) { clearInterval(id); resolve(); }
    }, 50);
    // Timeout after 3s to handle unauthenticated access
    setTimeout(() => { clearInterval(id); resolve(); }, 3000);
  });

  await waitForUser();

  const username = getProfileUsername() || (window._currentUser && window._currentUser.username);

  if (!username) {
    window.location.href = '/login.html';
    return;
  }

  try {
    const json = await apiFetch(`users/${encodeURIComponent(username)}`);
    _profileUser = json.data;

    document.title = `${_profileUser.full_name || _profileUser.username} — Connect`;

    renderProfileHeader(_profileUser);

    const tabsWrap = document.getElementById('profile-tabs-wrap');
    if (tabsWrap) tabsWrap.classList.remove('hidden');

    // Set profile link in topbar back to own profile if viewing someone else
    const topbarLink = document.getElementById('topbar-avatar-link');
    if (topbarLink && !isOwnProfile() && window._currentUser) {
      topbarLink.href = '/profile.html';
    }

    await loadProfilePosts();
    loadSuggestions();
  } catch (err) {
    const wrap = document.getElementById('profile-header-wrap');
    if (wrap) {
      wrap.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon" aria-hidden="true">👤</div>
          <h3>User not found</h3>
          <p>${escapeHtml(err.message || 'This profile does not exist.')}</p>
        </div>`;
    }
  }
});
