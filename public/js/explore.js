/**
 * explore.js — explore/search page logic.
 *
 * Depends on app.js (apiFetch, showToast, formatTimeAgo, renderAvatar,
 * escapeHtml, _currentUser).
 */

'use strict';

// ─── State ────────────────────────────────────────────────────────────────────

let _activeCategory = 'All';

// ─── Trending grid ────────────────────────────────────────────────────────────

async function loadTrending() {
  const gridEl = document.getElementById('trending-grid');
  if (!gridEl) return;

  try {
    const json = await apiFetch('search/trending');
    const posts = json.data || [];

    if (posts.length === 0) {
      gridEl.innerHTML = `
        <div style="grid-column:1/-1" class="empty-state">
          <div class="empty-state-icon" aria-hidden="true">✦</div>
          <h3>No trending posts yet</h3>
          <p>Be the first to post something!</p>
        </div>`;
      return;
    }

    gridEl.innerHTML = posts.map(post => {
      const imgContent = post.image
        ? `<img src="${escapeHtml(post.image)}" alt="Post by ${escapeHtml(post.full_name || post.username)}" loading="lazy" />`
        : `<div class="trending-tile-text">${escapeHtml(post.content.slice(0, 80))}${post.content.length > 80 ? '…' : ''}</div>`;

      const overlay = post.image
        ? `<div class="trending-tile-overlay" aria-hidden="true">
             <svg xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
               <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
             </svg>
             ${post.like_count || 0}
           </div>`
        : '';

      return `<div class="trending-tile" data-post-id="${post.id}" role="button" tabindex="0"
                aria-label="Post by ${escapeHtml(post.full_name || post.username)}: ${escapeHtml(post.content.slice(0, 60))}">
                ${imgContent}${overlay}
              </div>`;
    }).join('');

    // Wire clicks — navigate to author's profile or show post details
    gridEl.querySelectorAll('.trending-tile').forEach((tile, i) => {
      const post = posts[i];
      function activate() {
        // Navigate to profile page of post author
        window.location.href = `/profile.html?user=${encodeURIComponent(post.username)}`;
      }
      tile.addEventListener('click', activate);
      tile.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') activate(); });
    });
  } catch (err) {
    const gridEl = document.getElementById('trending-grid');
    if (gridEl) {
      gridEl.innerHTML = `<div style="grid-column:1/-1" class="empty-state"><h3>Could not load trending posts</h3></div>`;
    }
  }
}

// ─── Search ───────────────────────────────────────────────────────────────────

async function runSearch(query, type = 'all') {
  if (!query || !query.trim()) return;

  const resultsSection = document.getElementById('search-results');
  const trendingSection = document.getElementById('trending-section');
  const peopleResultsEl = document.getElementById('people-results');
  const postsResultsEl  = document.getElementById('posts-results');
  const peopleListEl    = document.getElementById('people-list');
  const postsListEl     = document.getElementById('posts-list');
  const noResultsEl     = document.getElementById('no-results');
  const titleEl         = document.getElementById('search-results-title');

  if (!resultsSection) return;

  // Show results, hide trending
  trendingSection && trendingSection.classList.add('hidden');
  resultsSection.classList.remove('hidden');
  if (titleEl) titleEl.textContent = `Results for "${escapeHtml(query)}"`;

  // Loading state
  peopleResultsEl && peopleResultsEl.classList.add('hidden');
  postsResultsEl  && postsResultsEl.classList.add('hidden');
  noResultsEl     && noResultsEl.classList.add('hidden');
  if (peopleListEl) peopleListEl.innerHTML = `<div class="loading-state"><span class="spinner"></span></div>`;

  try {
    const encoded = encodeURIComponent(query.trim());
    const json = await apiFetch(`search?q=${encoded}&type=${encodeURIComponent(type)}`);
    const { users = [], posts = [] } = json.data;

    let hasContent = false;

    if (users.length > 0 && peopleResultsEl && peopleListEl) {
      hasContent = true;
      peopleResultsEl.classList.remove('hidden');
      peopleListEl.innerHTML = users.map(u => renderUserCard(u)).join('');

      // Wire follow buttons
      peopleListEl.querySelectorAll('.search-follow-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
          const userId = btn.dataset.userId;
          const isFollowing = btn.dataset.following === '1';
          btn.disabled = true;
          try {
            const res = await apiFetch(`follows/${userId}`, { method: isFollowing ? 'DELETE' : 'POST' });
            const following = res.data.following;
            btn.dataset.following = following ? '1' : '0';
            btn.textContent = following ? 'Following' : 'Follow';
            btn.className = `btn btn-sm ${following ? 'btn-ghost' : 'btn-secondary'} search-follow-btn`;
          } catch (err) {
            showToast(err.message || 'Could not update follow', 'error');
          } finally {
            btn.disabled = false;
          }
        });
      });
    } else if (peopleResultsEl) {
      peopleResultsEl.classList.add('hidden');
    }

    if (posts.length > 0 && postsResultsEl && postsListEl) {
      hasContent = true;
      postsResultsEl.classList.remove('hidden');
      postsListEl.innerHTML = posts.map(post => renderSearchPost(post)).join('');
    } else if (postsResultsEl) {
      postsResultsEl.classList.add('hidden');
    }

    if (!hasContent && noResultsEl) {
      noResultsEl.classList.remove('hidden');
    }
  } catch (err) {
    if (peopleListEl) {
      peopleListEl.innerHTML = `<div class="empty-state"><h3>Search failed</h3><p>${escapeHtml(err.message)}</p></div>`;
    }
    peopleResultsEl && peopleResultsEl.classList.remove('hidden');
  }
}

function renderUserCard(u) {
  const currentUser = window._currentUser;
  const isSelf = currentUser && currentUser.id === u.id;
  const isFollowing = !!u.is_following;
  const avatar = renderAvatar({ full_name: u.full_name, username: u.username, avatar: u.avatar }, 'sm');

  const followBtn = !isSelf
    ? `<button class="btn btn-sm ${isFollowing ? 'btn-ghost' : 'btn-secondary'} search-follow-btn"
         data-user-id="${u.id}" data-following="${isFollowing ? '1' : '0'}"
         aria-label="${isFollowing ? 'Unfollow' : 'Follow'} ${escapeHtml(u.username)}">
         ${isFollowing ? 'Following' : 'Follow'}
       </button>` : '';

  return `<a class="user-result-card" href="/profile.html?user=${encodeURIComponent(u.username)}">
    ${avatar}
    <div class="user-result-info">
      <div class="user-result-name">${escapeHtml(u.full_name || u.username)}</div>
      <div class="user-result-handle">@${escapeHtml(u.username)}</div>
      ${u.bio ? `<div class="user-result-bio">${escapeHtml(u.bio)}</div>` : ''}
    </div>
    ${followBtn}
  </a>`;
}

function renderSearchPost(post) {
  const liked      = !!post.is_liked;
  const bookmarked = !!post.is_bookmarked;
  const avatar = renderAvatar({ full_name: post.full_name, username: post.username, avatar: post.avatar }, 'sm');
  const imageHtml = post.image
    ? `<div class="post-image-container"><img src="${escapeHtml(post.image)}" alt="Post image" class="post-image" loading="lazy" /></div>`
    : '';

  return `
    <article class="post-card" style="margin-bottom:var(--space-3)" data-post-id="${post.id}">
      <div class="post-header">
        <a class="post-author" href="/profile.html?user=${encodeURIComponent(post.username)}">
          ${avatar}
          <div class="post-author-info">
            <span class="post-author-name">${escapeHtml(post.full_name || post.username)}</span>
            <span class="post-author-meta">@${escapeHtml(post.username)} · ${formatTimeAgo(post.created_at)}</span>
          </div>
        </a>
      </div>
      <div class="post-content">${escapeHtml(post.content)}</div>
      ${imageHtml}
      <div class="post-stats">
        <span>${post.like_count || 0} like${post.like_count === 1 ? '' : 's'}</span>
        <span>${post.comment_count || 0} comment${post.comment_count === 1 ? '' : 's'}</span>
      </div>
      <div class="post-actions" role="group" aria-label="Post actions">
        <button class="post-action-btn like-btn${liked ? ' liked' : ''}"
          data-explore-action="like" data-post-id="${post.id}"
          data-liked="${liked ? '1' : '0'}"
          aria-label="${liked ? 'Unlike' : 'Like'} post" aria-pressed="${liked}">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18"
            fill="${liked ? 'currentColor' : 'none'}"
            stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
          </svg>
          <span class="like-count">${post.like_count || 0}</span>
        </button>
      </div>
    </article>`;
}

// ─── Event delegation for post like actions in search results ─────────────────

document.addEventListener('DOMContentLoaded', () => {
  document.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-explore-action="like"]');
    if (!btn) return;

    const postId = btn.dataset.postId;
    const isLiked = btn.dataset.liked === '1';
    const method = isLiked ? 'DELETE' : 'POST';
    const countEl = btn.querySelector('.like-count');
    const svgPath = btn.querySelector('svg path');
    const current = parseInt(countEl.textContent, 10) || 0;

    btn.dataset.liked = isLiked ? '0' : '1';
    btn.classList.toggle('liked', !isLiked);
    if (svgPath) svgPath.setAttribute('fill', !isLiked ? 'currentColor' : 'none');
    countEl.textContent = isLiked ? Math.max(0, current - 1) : current + 1;

    try {
      const json = await apiFetch(`likes/posts/${postId}`, { method });
      countEl.textContent = json.data.like_count;
      const postCard = btn.closest('.post-card');
      const statSpan = postCard && postCard.querySelector('.post-stats span:first-child');
      if (statSpan) statSpan.textContent = `${json.data.like_count} like${json.data.like_count === 1 ? '' : 's'}`;
    } catch (err) {
      btn.dataset.liked = isLiked ? '1' : '0';
      btn.classList.toggle('liked', isLiked);
      if (svgPath) svgPath.setAttribute('fill', isLiked ? 'currentColor' : 'none');
      countEl.textContent = current;
      showToast(err.message || 'Could not update like', 'error');
    }
  });
});

// ─── Category pills ───────────────────────────────────────────────────────────

function wireCategories() {
  const pills = document.querySelectorAll('.category-pill');
  pills.forEach(pill => {
    pill.addEventListener('click', () => {
      pills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');

      const category = pill.dataset.category;
      _activeCategory = category;

      const searchInput = document.getElementById('explore-search-input');

      if (category === 'All') {
        // Show trending, hide results
        const trendingSection = document.getElementById('trending-section');
        const resultsSection  = document.getElementById('search-results');
        trendingSection && trendingSection.classList.remove('hidden');
        resultsSection  && resultsSection.classList.add('hidden');
        if (searchInput) searchInput.value = '';
      } else {
        if (searchInput) searchInput.value = category;
        runSearch(category, 'posts');
      }
    });
  });
}

// ─── Search form ──────────────────────────────────────────────────────────────

function wireSearchForm() {
  const form  = document.getElementById('explore-search-form');
  const input = document.getElementById('explore-search-input');

  if (!form || !input) return;

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const q = input.value.trim();
    if (!q) return;

    // Reset category pills
    document.querySelectorAll('.category-pill').forEach(p => p.classList.remove('active'));
    const allPill = document.querySelector('.category-pill[data-category="All"]');
    if (allPill) allPill.classList.add('active');
    _activeCategory = 'All';

    runSearch(q, 'all');
  });

  // Also handle Enter key in input
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      form.dispatchEvent(new Event('submit'));
    }
  });
}

// ─── Suggestions sidebar ──────────────────────────────────────────────────────

async function loadSuggestions() {
  const listEl = document.getElementById('suggestions-list');
  if (!listEl) return;

  try {
    const json = await apiFetch('users/suggestions');
    const users = (json.data || []).slice(0, 4);

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
          <button class="btn btn-secondary btn-sm sidebar-follow-btn" data-user-id="${u.id}">Follow</button>
        </div>`;
    }).join('');

    listEl.querySelectorAll('.sidebar-follow-btn').forEach(btn => {
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

document.addEventListener('DOMContentLoaded', () => {
  wireCategories();
  wireSearchForm();
  loadSuggestions();

  // Check if there's a ?q= query param (from topbar search redirect)
  const params = new URLSearchParams(window.location.search);
  const initialQuery = params.get('q');

  if (initialQuery) {
    const input = document.getElementById('explore-search-input');
    if (input) input.value = initialQuery;
    runSearch(initialQuery, 'all');
  } else {
    loadTrending();
  }
});
