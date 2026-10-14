const express = require('express');
const db = require('../database/db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// ─── POST /api/likes/posts/:postId — like a post ─────────────────────────────

router.post('/posts/:postId', requireAuth, (req, res) => {
  const currentUserId = req.session.userId;
  const postId = parseInt(req.params.postId, 10);

  try {
    const post = db.prepare('SELECT id, user_id FROM posts WHERE id = ?').get(postId);
    if (!post) {
      return res.status(404).json({ success: false, error: 'Post not found' });
    }

    // INSERT OR IGNORE prevents duplicates
    db.prepare('INSERT OR IGNORE INTO likes (user_id, post_id) VALUES (?, ?)').run(currentUserId, postId);

    // Create a notification if not liking own post
    if (post.user_id !== currentUserId) {
      db.prepare(
        'INSERT INTO notifications (user_id, actor_id, type, post_id) VALUES (?, ?, ?, ?)'
      ).run(post.user_id, currentUserId, 'like', postId);
    }

    const { like_count } = db
      .prepare('SELECT COUNT(*) AS like_count FROM likes WHERE post_id = ?')
      .get(postId);

    return res.json({ success: true, data: { liked: true, like_count } });
  } catch (err) {
    console.error('POST /api/likes/posts/:postId error:', err);
    return res.status(500).json({ success: false, error: 'Server error' });
  }
});

// ─── DELETE /api/likes/posts/:postId — unlike a post ─────────────────────────

router.delete('/posts/:postId', requireAuth, (req, res) => {
  const currentUserId = req.session.userId;
  const postId = parseInt(req.params.postId, 10);

  try {
    const post = db.prepare('SELECT id FROM posts WHERE id = ?').get(postId);
    if (!post) {
      return res.status(404).json({ success: false, error: 'Post not found' });
    }

    db.prepare('DELETE FROM likes WHERE user_id = ? AND post_id = ?').run(currentUserId, postId);

    const { like_count } = db
      .prepare('SELECT COUNT(*) AS like_count FROM likes WHERE post_id = ?')
      .get(postId);

    return res.json({ success: true, data: { liked: false, like_count } });
  } catch (err) {
    console.error('DELETE /api/likes/posts/:postId error:', err);
    return res.status(500).json({ success: false, error: 'Server error' });
  }
});

module.exports = router;
