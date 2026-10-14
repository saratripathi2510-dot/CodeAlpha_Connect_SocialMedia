const express = require('express');
const db = require('../database/db');
const { optionalAuth } = require('../middleware/auth');

const router = express.Router();

// ─── GET /api/search?q=query&type=all|users|posts ─────────────────────────────

router.get('/', optionalAuth, (req, res) => {
  const q = req.query.q || '';
  const type = req.query.type || 'all';
  const currentUserId = req.session && req.session.userId ? req.session.userId : null;

  if (!q.trim()) {
    return res.json({ success: true, data: { users: [], posts: [] } });
  }

  const pattern = `%${q}%`;

  try {
    let users = [];
    let posts = [];

    if (type === 'all' || type === 'users') {
      users = db.prepare(`
        SELECT
          u.id, u.username, u.full_name, u.avatar, u.bio,
          (SELECT COUNT(*) FROM follows WHERE following_id = u.id) AS follower_count,
          ${currentUserId
            ? `(SELECT COUNT(*) FROM follows WHERE follower_id = ${Number(currentUserId)} AND following_id = u.id)`
            : '0'} AS is_following
        FROM users u
        WHERE LOWER(u.username) LIKE LOWER(?) OR LOWER(u.full_name) LIKE LOWER(?)
        ORDER BY follower_count DESC
        LIMIT 20
      `).all(pattern, pattern);
    }

    if (type === 'all' || type === 'posts') {
      const likedSub = currentUserId
        ? `(SELECT COUNT(*) FROM likes WHERE likes.post_id = p.id AND likes.user_id = ${Number(currentUserId)})`
        : '0';
      const bookmarkedSub = currentUserId
        ? `(SELECT COUNT(*) FROM bookmarks WHERE bookmarks.post_id = p.id AND bookmarks.user_id = ${Number(currentUserId)})`
        : '0';

      posts = db.prepare(`
        SELECT
          p.id, p.user_id, p.content, p.image, p.created_at, p.updated_at,
          u.username, u.full_name, u.avatar,
          (SELECT COUNT(*) FROM likes    WHERE likes.post_id    = p.id) AS like_count,
          (SELECT COUNT(*) FROM comments WHERE comments.post_id = p.id) AS comment_count,
          ${likedSub}      AS is_liked,
          ${bookmarkedSub} AS is_bookmarked
        FROM posts p
        JOIN users u ON u.id = p.user_id
        WHERE LOWER(p.content) LIKE LOWER(?)
        ORDER BY p.created_at DESC
        LIMIT 20
      `).all(pattern);
    }

    return res.json({ success: true, data: { users, posts } });
  } catch (err) {
    console.error('GET /api/search error:', err);
    return res.status(500).json({ success: false, error: 'Server error' });
  }
});

// ─── GET /api/search/trending — return top 6 posts by likes in last 7 days ────

router.get('/trending', optionalAuth, (req, res) => {
  const currentUserId = req.session && req.session.userId ? req.session.userId : null;

  try {
    const likedSub = currentUserId
      ? `(SELECT COUNT(*) FROM likes WHERE likes.post_id = p.id AND likes.user_id = ${Number(currentUserId)})`
      : '0';
    const bookmarkedSub = currentUserId
      ? `(SELECT COUNT(*) FROM bookmarks WHERE bookmarks.post_id = p.id AND bookmarks.user_id = ${Number(currentUserId)})`
      : '0';

    const posts = db.prepare(`
      SELECT
        p.id, p.user_id, p.content, p.image, p.created_at, p.updated_at,
        u.username, u.full_name, u.avatar,
        (SELECT COUNT(*) FROM likes    WHERE likes.post_id    = p.id) AS like_count,
        (SELECT COUNT(*) FROM comments WHERE comments.post_id = p.id) AS comment_count,
        ${likedSub}      AS is_liked,
        ${bookmarkedSub} AS is_bookmarked
      FROM posts p
      JOIN users u ON u.id = p.user_id
      WHERE p.created_at >= datetime('now', '-7 days')
      ORDER BY like_count DESC, p.created_at DESC
      LIMIT 6
    `).all();

    return res.json({ success: true, data: posts });
  } catch (err) {
    console.error('GET /api/search/trending error:', err);
    return res.status(500).json({ success: false, error: 'Server error' });
  }
});

module.exports = router;
