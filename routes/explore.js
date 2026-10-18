const express = require('express');
const router = express.Router();
const db = require('../database/db');
const { requireAuth } = require('../middleware/auth');

function getCurrentUser(userId) {
  return db.prepare('SELECT id, username, display_name, avatar_url FROM users WHERE id = ?').get(userId);
}

// GET /explore
router.get('/explore', requireAuth, (req, res) => {
  const currentUser = getCurrentUser(req.session.userId);
  const q = req.query.q ? req.query.q.trim() : '';
  const filter = req.query.filter || 'all';

  let users = [], posts = [];

  if (q) {
    if (filter === 'all' || filter === 'people') {
      users = db.prepare(`
        SELECT u.id, u.username, u.display_name, u.avatar_url, u.bio,
          (SELECT COUNT(*) FROM follows WHERE following_id = u.id) as follower_count,
          (SELECT 1 FROM follows WHERE follower_id = ? AND following_id = u.id) as is_following
        FROM users u
        WHERE (u.username LIKE ? OR u.display_name LIKE ?)
          AND u.id != ?
        LIMIT 20
      `).all(req.session.userId, `%${q}%`, `%${q}%`, req.session.userId);
    }
    if (filter === 'all' || filter === 'posts') {
      posts = db.prepare(`
        SELECT p.*, u.username, u.display_name, u.avatar_url,
          (SELECT COUNT(*) FROM likes WHERE post_id = p.id) as like_count,
          (SELECT COUNT(*) FROM comments WHERE post_id = p.id) as comment_count,
          (SELECT 1 FROM likes WHERE post_id = p.id AND user_id = ?) as is_liked,
          (SELECT 1 FROM bookmarks WHERE post_id = p.id AND user_id = ?) as is_bookmarked
        FROM posts p
        JOIN users u ON p.user_id = u.id
        WHERE p.content LIKE ?
        ORDER BY p.created_at DESC
        LIMIT 30
      `).all(req.session.userId, req.session.userId, `%${q}%`);
    }
  } else {
    // Default: show recent public posts with media
    posts = db.prepare(`
      SELECT p.*, u.username, u.display_name, u.avatar_url,
        (SELECT COUNT(*) FROM likes WHERE post_id = p.id) as like_count,
        (SELECT COUNT(*) FROM comments WHERE post_id = p.id) as comment_count,
        (SELECT 1 FROM likes WHERE post_id = p.id AND user_id = ?) as is_liked,
        (SELECT 1 FROM bookmarks WHERE post_id = p.id AND user_id = ?) as is_bookmarked
      FROM posts p
      JOIN users u ON p.user_id = u.id
      ORDER BY p.created_at DESC
      LIMIT 50
    `).all(req.session.userId, req.session.userId);
  }

  // API search endpoint
  if (req.headers.accept && req.headers.accept.includes('application/json')) {
    return res.json({ users, posts });
  }

  res.render('explore', {
    title: 'Explore — Connect',
    currentUser,
    q,
    filter,
    users,
    posts
  });
});

// GET /api/search — JSON search
router.get('/api/search', requireAuth, (req, res) => {
  const q = req.query.q ? req.query.q.trim() : '';
  if (!q || q.length < 2) return res.json({ users: [], posts: [] });

  const users = db.prepare(`
    SELECT id, username, display_name, avatar_url
    FROM users
    WHERE (username LIKE ? OR display_name LIKE ?) AND id != ?
    LIMIT 5
  `).all(`%${q}%`, `%${q}%`, req.session.userId);

  res.json({ users });
});

module.exports = router;
