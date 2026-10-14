const express = require('express');
const path = require('path');
const fs = require('fs');
const { body, validationResult } = require('express-validator');
const db = require('../database/db');
const { requireAuth, optionalAuth } = require('../middleware/auth');
const { postImageUpload } = require('../middleware/upload');

const router = express.Router();

// ─── Helper: build the core SELECT for a post with aggregates ────────────────

function buildPostQuery(currentUserId) {
  const likedSub = currentUserId
    ? `(SELECT COUNT(*) FROM likes WHERE likes.post_id = p.id AND likes.user_id = ${Number(currentUserId)})`
    : '0';
  const bookmarkedSub = currentUserId
    ? `(SELECT COUNT(*) FROM bookmarks WHERE bookmarks.post_id = p.id AND bookmarks.user_id = ${Number(currentUserId)})`
    : '0';

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

// ─── GET /api/posts — public feed (most recent 20) ───────────────────────────

router.get('/', optionalAuth, (req, res) => {
  const currentUserId = req.session && req.session.userId ? req.session.userId : null;
  const page  = Math.max(1, parseInt(req.query.page,  10) || 1);
  const limit = Math.min(50, parseInt(req.query.limit, 10) || 20);
  const offset = (page - 1) * limit;

  try {
    const sql = buildPostQuery(currentUserId) +
      ` ORDER BY p.created_at DESC LIMIT ? OFFSET ?`;
    const posts = db.prepare(sql).all(limit, offset);
    return res.json({ success: true, data: posts });
  } catch (err) {
    console.error('GET /api/posts error:', err);
    return res.status(500).json({ success: false, error: 'Server error' });
  }
});

// ─── GET /api/posts/feed — authenticated feed (followed + own) ───────────────

router.get('/feed', requireAuth, (req, res) => {
  const currentUserId = req.session.userId;
  const page  = Math.max(1, parseInt(req.query.page,  10) || 1);
  const limit = Math.min(50, parseInt(req.query.limit, 10) || 20);
  const offset = (page - 1) * limit;

  try {
    const sql = buildPostQuery(currentUserId) +
      ` WHERE p.user_id = ? OR p.user_id IN (
          SELECT following_id FROM follows WHERE follower_id = ?
        )
        ORDER BY p.created_at DESC LIMIT ? OFFSET ?`;
    const posts = db.prepare(sql).all(currentUserId, currentUserId, limit, offset);
    return res.json({ success: true, data: posts });
  } catch (err) {
    console.error('GET /api/posts/feed error:', err);
    return res.status(500).json({ success: false, error: 'Server error' });
  }
});

// ─── GET /api/posts/:id — single post ────────────────────────────────────────

router.get('/:id', optionalAuth, (req, res) => {
  const currentUserId = req.session && req.session.userId ? req.session.userId : null;

  try {
    const sql = buildPostQuery(currentUserId) + ` WHERE p.id = ?`;
    const post = db.prepare(sql).get(req.params.id);
    if (!post) {
      return res.status(404).json({ success: false, error: 'Post not found' });
    }
    return res.json({ success: true, data: post });
  } catch (err) {
    console.error('GET /api/posts/:id error:', err);
    return res.status(500).json({ success: false, error: 'Server error' });
  }
});

// ─── POST /api/posts — create post ───────────────────────────────────────────

router.post(
  '/',
  requireAuth,
  (req, res, next) => {
    postImageUpload(req, res, (err) => {
      if (err) {
        return res.status(400).json({ success: false, error: err.message });
      }
      next();
    });
  },
  [
    body('content')
      .trim()
      .isLength({ min: 1, max: 500 })
      .withMessage('Post content must be between 1 and 500 characters')
  ],
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      // Clean up uploaded file on validation error
      if (req.file) {
        fs.unlink(req.file.path, () => {});
      }
      return res.status(422).json({ success: false, error: errors.array()[0].msg });
    }

    const { content } = req.body;
    const imageUrl = req.file ? `/uploads/${req.file.filename}` : null;
    const currentUserId = req.session.userId;

    try {
      const result = db
        .prepare('INSERT INTO posts (user_id, content, image) VALUES (?, ?, ?)')
        .run(currentUserId, content.trim(), imageUrl);

      const sql = buildPostQuery(currentUserId) + ` WHERE p.id = ?`;
      const post = db.prepare(sql).get(result.lastInsertRowid);

      return res.status(201).json({ success: true, data: post });
    } catch (err) {
      console.error('POST /api/posts error:', err);
      return res.status(500).json({ success: false, error: 'Server error' });
    }
  }
);

// ─── PUT /api/posts/:id — edit post (owner only) ─────────────────────────────

router.put(
  '/:id',
  requireAuth,
  [
    body('content')
      .trim()
      .isLength({ min: 1, max: 500 })
      .withMessage('Post content must be between 1 and 500 characters')
  ],
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({ success: false, error: errors.array()[0].msg });
    }

    const currentUserId = req.session.userId;
    const postId = req.params.id;

    try {
      const existing = db.prepare('SELECT * FROM posts WHERE id = ?').get(postId);
      if (!existing) {
        return res.status(404).json({ success: false, error: 'Post not found' });
      }
      if (existing.user_id !== currentUserId) {
        return res.status(403).json({ success: false, error: 'You can only edit your own posts' });
      }

      db.prepare('UPDATE posts SET content = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
        .run(req.body.content.trim(), postId);

      const sql = buildPostQuery(currentUserId) + ` WHERE p.id = ?`;
      const post = db.prepare(sql).get(postId);

      return res.json({ success: true, data: post });
    } catch (err) {
      console.error('PUT /api/posts/:id error:', err);
      return res.status(500).json({ success: false, error: 'Server error' });
    }
  }
);

// ─── DELETE /api/posts/:id — delete post (owner only) ────────────────────────

router.delete('/:id', requireAuth, (req, res) => {
  const currentUserId = req.session.userId;
  const postId = req.params.id;

  try {
    const existing = db.prepare('SELECT * FROM posts WHERE id = ?').get(postId);
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Post not found' });
    }
    if (existing.user_id !== currentUserId) {
      return res.status(403).json({ success: false, error: 'You can only delete your own posts' });
    }

    // Remove image file from disk if present
    if (existing.image) {
      const imagePath = path.join(__dirname, '..', existing.image);
      if (fs.existsSync(imagePath)) {
        fs.unlink(imagePath, () => {});
      }
    }

    // Cascade deletes via FK constraints (likes, comments, bookmarks, notifications)
    db.prepare('DELETE FROM posts WHERE id = ?').run(postId);

    return res.json({ success: true, message: 'Post deleted' });
  } catch (err) {
    console.error('DELETE /api/posts/:id error:', err);
    return res.status(500).json({ success: false, error: 'Server error' });
  }
});

module.exports = router;
