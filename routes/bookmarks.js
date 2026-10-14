const express = require('express');
const db = require('../database/db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// ─── Helper reused from posts.js pattern ─────────────────────────────────────

function buildPostQuery(currentUserId) {
  const likedSub = `(SELECT COUNT(*) FROM likes WHERE likes.post_id = p.id AND likes.user_id = ${Number(currentUserId)})`;
  const bookmarkedSub = `(SELECT COUNT(*) FROM bookmarks WHERE bookmarks.post_id = p.id AND bookmarks.user_id = ${Number(currentUserId)})`;

  return `
    SELECT
      p.id,
      p.user_id,
      p.content,
      p.image,
      p.created_at,
      p.updated_at,
      u.username,
      u.full_name,
      u.avatar,
      (SELECT COUNT(*) FROM likes    WHERE likes.post_id    = p.id) AS like_count,
      (SELECT COUNT(*) FROM comments WHERE comments.post_id = p.id) AS comment_count,
      ${likedSub}      AS is_liked,
      ${bookmarkedSub} AS is_bookmarked
    FROM posts p
    JOIN users u ON u.id = p.user_id
  `;
}

// ─── POST /api/bookmarks/posts/:postId — bookmark ────────────────────────────

router.post('/posts/:postId', requireAuth, (req, res) => {
  const currentUserId = req.session.userId;
  const postId = parseInt(req.params.postId, 10);

  try {
    const post = db.prepare('SELECT id FROM posts WHERE id = ?').get(postId);
    if (!post) {
      return res.status(404).json({ success: false, error: 'Post not found' });
    }

    db.prepare('INSERT OR IGNORE INTO bookmarks (user_id, post_id) VALUES (?, ?)').run(currentUserId, postId);

    return res.json({ success: true, data: { bookmarked: true } });
  } catch (err) {
    console.error('POST /api/bookmarks/posts/:postId error:', err);
    return res.status(500).json({ success: false, error: 'Server error' });
  }
});

// ─── DELETE /api/bookmarks/posts/:postId — remove bookmark ───────────────────

router.delete('/posts/:postId', requireAuth, (req, res) => {
  const currentUserId = req.session.userId;
  const postId = parseInt(req.params.postId, 10);

  try {
    db.prepare('DELETE FROM bookmarks WHERE user_id = ? AND post_id = ?').run(currentUserId, postId);

    return res.json({ success: true, data: { bookmarked: false } });
  } catch (err) {
    console.error('DELETE /api/bookmarks/posts/:postId error:', err);
    return res.status(500).json({ success: false, error: 'Server error' });
  }
});

// ─── GET /api/bookmarks — get all bookmarks for current user ─────────────────

router.get('/', requireAuth, (req, res) => {
  const currentUserId = req.session.userId;

  try {
    const sql =
      buildPostQuery(currentUserId) +
      ` JOIN bookmarks bm ON bm.post_id = p.id AND bm.user_id = ?
        ORDER BY bm.created_at DESC`;

    const posts = db.prepare(sql).all(currentUserId);

    return res.json({ success: true, data: posts });
  } catch (err) {
    console.error('GET /api/bookmarks error:', err);
    return res.status(500).json({ success: false, error: 'Server error' });
  }
});

module.exports = router;
