/**
 * Connect — Feed Interactions
 * Handles like, bookmark, follow, dropdown, media preview, character count.
 */
document.addEventListener('DOMContentLoaded', () => {

  // ── Like Button ─────────────────────────────────────────────────────────
  document.querySelectorAll('.like-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.preventDefault();
      const postId = btn.dataset.postId;
      const countEl = btn.querySelector('.count');
      btn.disabled = true;

      try {
        const res = await fetch(`/posts/${postId}/like`, { method: 'POST' });
        const data = await res.json();
        btn.classList.toggle('liked', data.liked);
        if (countEl) countEl.textContent = data.count;

        // Animate heart
        btn.animate([
          { transform: 'scale(1)' },
          { transform: 'scale(1.35)' },
          { transform: 'scale(1)' }
        ], { duration: 300, easing: 'ease-out' });
      } catch (err) {
        console.error('Like error:', err);
      } finally {
        btn.disabled = false;
      }
    });
  });

  // ── Bookmark Button ──────────────────────────────────────────────────────
  document.querySelectorAll('.bookmark-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.preventDefault();
      const postId = btn.dataset.postId;
      btn.disabled = true;

      try {
        const res = await fetch(`/posts/${postId}/bookmark`, { method: 'POST' });
        const data = await res.json();
        btn.classList.toggle('bookmarked', data.bookmarked);

        // Animate
        btn.animate([
          { transform: 'scale(1)' },
          { transform: 'scale(1.3)' },
          { transform: 'scale(1)' }
        ], { duration: 250, easing: 'ease-out' });
      } catch (err) {
        console.error('Bookmark error:', err);
      } finally {
        btn.disabled = false;
      }
    });
  });

  // ── Dropdown Menus ───────────────────────────────────────────────────────
  document.querySelectorAll('.dropdown').forEach(dropdown => {
    const trigger = dropdown.querySelector('[data-dropdown-trigger]');
    if (!trigger) return;

    trigger.addEventListener('click', (e) => {
      e.stopPropagation();
      // Close others
      document.querySelectorAll('.dropdown.open').forEach(d => {
        if (d !== dropdown) d.classList.remove('open');
      });
      dropdown.classList.toggle('open');
    });
  });

  document.addEventListener('click', () => {
    document.querySelectorAll('.dropdown.open').forEach(d => d.classList.remove('open'));
  });

  // ── Auto-resize Textareas ────────────────────────────────────────────────
  document.querySelectorAll('textarea[data-autoresize]').forEach(ta => {
    function resize() {
      ta.style.height = 'auto';
      ta.style.height = ta.scrollHeight + 'px';
    }
    ta.addEventListener('input', resize);
    resize();
  });

  // ── Character Counter ────────────────────────────────────────────────────
  const composerTA = document.getElementById('post-content');
  const charCount = document.getElementById('char-count');
  const MAX_CHARS = 500;
  if (composerTA && charCount) {
    composerTA.addEventListener('input', () => {
      const remaining = MAX_CHARS - composerTA.value.length;
      charCount.textContent = remaining;
      charCount.classList.remove('warning', 'danger');
      if (remaining < 50) charCount.classList.add('warning');
      if (remaining < 10) charCount.classList.add('danger');
    });
  }

  // ── Media Preview ────────────────────────────────────────────────────────
  const mediaInput = document.getElementById('post-media');
  const previewWrap = document.getElementById('media-preview-wrap');
  const previewImg = document.getElementById('media-preview-img');
  const removeBtn = document.getElementById('media-preview-remove');

  if (mediaInput && previewWrap && previewImg) {
    mediaInput.addEventListener('change', () => {
      const file = mediaInput.files[0];
      if (file) {
        const url = URL.createObjectURL(file);
        previewImg.src = url;
        previewWrap.classList.add('visible');
      }
    });

    if (removeBtn) {
      removeBtn.addEventListener('click', () => {
        mediaInput.value = '';
        previewImg.src = '';
        previewWrap.classList.remove('visible');
      });
    }
  }

  // ── Notification badge polling (every 60s) ───────────────────────────────
  const notifBadge = document.getElementById('notif-badge');
  const msgBadge = document.getElementById('msg-badge');

  async function pollCounts() {
    try {
      const [notifRes, msgRes] = await Promise.all([
        fetch('/api/notifications/count'),
        fetch('/api/messages/count')
      ]);
      const notifData = await notifRes.json();
      const msgData = await msgRes.json();

      if (notifBadge) {
        notifBadge.textContent = notifData.count;
        notifBadge.style.display = notifData.count > 0 ? 'inline-flex' : 'none';
      }
      if (msgBadge) {
        msgBadge.textContent = msgData.count;
        msgBadge.style.display = msgData.count > 0 ? 'inline-flex' : 'none';
      }
    } catch (e) { /* silent */ }
  }

  // Only poll if user is logged in (badges exist)
  if (notifBadge || msgBadge) {
    setInterval(pollCounts, 60000);
  }

  // ── Flash message auto-dismiss ───────────────────────────────────────────
  document.querySelectorAll('.flash').forEach(flash => {
    setTimeout(() => {
      flash.style.transition = 'opacity 0.4s ease';
      flash.style.opacity = '0';
      setTimeout(() => flash.remove(), 400);
    }, 4000);
  });

  // ── Mobile nav active state ──────────────────────────────────────────────
  const path = window.location.pathname;
  document.querySelectorAll('.nav-item[href]').forEach(link => {
    if (link.getAttribute('href') === path ||
        (path.startsWith(link.getAttribute('href')) && link.getAttribute('href') !== '/')) {
      link.classList.add('active');
    }
  });

});
