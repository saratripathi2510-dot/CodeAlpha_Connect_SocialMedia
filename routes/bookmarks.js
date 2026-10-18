const express = require('express');
const router = express.Router();
const db = require('../database/db');
const { requireAuth } = require('../middleware/auth');

function getCurrentUser(userId) {
  return db.prepare('SELECT id, username, display_name, avatar_url FROM users WHERE id = ?').get(userId);
}

// GET /bookmarks
router.get('/bookmarks', requireAuth, (req, res) => {
  const currentUser = getCurrentUser(req.session.userId);

  const posts = db.prepare(`
    SELECT p.*, u.username, u.display_name, u.avatar_url,
      (SELECT COUNT(*) FROM likes WHERE post_id = p.id) as like_count,
      (SELECT COUNT(*) FROM comments WHERE post_id = p.id) as comment_count,
      (SELECT 1 FROM likes WHERE post_id = p.id AND user_id = ?) as is_liked,
      1 as is_bookmarked,
      b.created_at as saved_at
    FROM bookmarks b
    JOIN posts p ON b.post_id = p.id
    JOIN users u ON p.user_id = u.id
    WHERE b.user_id = ?
    ORDER BY b.created_at DESC
  `).all(req.session.userId, req.session.userId);

  res.render('bookmarks', {
    title: 'Saved Posts — Connect',
    currentUser,
    posts
  });
});

module.exports = router;
