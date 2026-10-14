const express = require('express');
const { body, validationResult } = require('express-validator');
const db = require('../database/db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// ─── GET /api/comments/posts/:postId — get comments for a post ───────────────

router.get('/posts/:postId', (req, res) => {
  const postId = parseInt(req.params.postId, 10);

  try {
    const post = db.prepare('SELECT id FROM posts WHERE id = ?').get(postId);
    if (!post) {
      return res.status(404).json({ success: false, error: 'Post not found' });
    }

    const comments = db
      .prepare(
        `SELECT
          c.id,
          c.user_id,
          c.post_id,
          c.content,
          c.created_at,
          u.username,
          u.full_name,
          u.avatar
        FROM comments c
        JOIN users u ON u.id = c.user_id
        WHERE c.post_id = ?
        ORDER BY c.created_at ASC`
      )
      .all(postId);

    return res.json({ success: true, data: comments });
  } catch (err) {
    console.error('GET /api/comments/posts/:postId error:', err);
    return res.status(500).json({ success: false, error: 'Server error' });
  }
});

// ─── POST /api/comments/posts/:postId — add comment ──────────────────────────

router.post(
  '/posts/:postId',
  requireAuth,
  [
    body('content')
      .trim()
      .isLength({ min: 1, max: 300 })
      .withMessage('Comment must be between 1 and 300 characters')
  ],
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({ success: false, error: errors.array()[0].msg });
    }

    const currentUserId = req.session.userId;
    const postId = parseInt(req.params.postId, 10);

    try {
      const post = db.prepare('SELECT id, user_id FROM posts WHERE id = ?').get(postId);
      if (!post) {
        return res.status(404).json({ success: false, error: 'Post not found' });
      }

      const result = db
        .prepare('INSERT INTO comments (user_id, post_id, content) VALUES (?, ?, ?)')
        .run(currentUserId, postId, req.body.content.trim());

      // Create notification if not commenting on own post
      if (post.user_id !== currentUserId) {
        db.prepare(
          'INSERT INTO notifications (user_id, actor_id, type, post_id, comment_id) VALUES (?, ?, ?, ?, ?)'
        ).run(post.user_id, currentUserId, 'comment', postId, result.lastInsertRowid);
      }

      const comment = db
        .prepare(
          `SELECT
            c.id,
            c.user_id,
            c.post_id,
            c.content,
            c.created_at,
            u.username,
            u.full_name,
            u.avatar
          FROM comments c
          JOIN users u ON u.id = c.user_id
          WHERE c.id = ?`
        )
        .get(result.lastInsertRowid);

      return res.status(201).json({ success: true, data: comment });
    } catch (err) {
      console.error('POST /api/comments/posts/:postId error:', err);
      return res.status(500).json({ success: false, error: 'Server error' });
    }
  }
);

// ─── DELETE /api/comments/:commentId — delete comment ────────────────────────

router.delete('/:commentId', requireAuth, (req, res) => {
  const currentUserId = req.session.userId;
  const commentId = parseInt(req.params.commentId, 10);

  try {
    const comment = db
      .prepare('SELECT c.*, p.user_id AS post_owner_id FROM comments c JOIN posts p ON p.id = c.post_id WHERE c.id = ?')
      .get(commentId);

    if (!comment) {
      return res.status(404).json({ success: false, error: 'Comment not found' });
    }

    const isOwner = comment.user_id === currentUserId;
    const isPostOwner = comment.post_owner_id === currentUserId;

    if (!isOwner && !isPostOwner) {
      return res.status(403).json({ success: false, error: 'Not authorised to delete this comment' });
    }

    db.prepare('DELETE FROM comments WHERE id = ?').run(commentId);

    return res.json({ success: true, message: 'Comment deleted' });
  } catch (err) {
    console.error('DELETE /api/comments/:commentId error:', err);
    return res.status(500).json({ success: false, error: 'Server error' });
  }
});

module.exports = router;
