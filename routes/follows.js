const express = require('express');
const db = require('../database/db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// ─── GET follower_count helper ────────────────────────────────────────────────

function getFollowerCount(userId) {
  const row = db.prepare(
    'SELECT COUNT(*) AS follower_count FROM follows WHERE following_id = ?'
  ).get(userId);
  return row ? row.follower_count : 0;
}

// ─── POST /api/follows/:userId — follow a user ────────────────────────────────

router.post('/:userId', requireAuth, (req, res) => {
  const currentUserId = req.session.userId;
  const targetId = parseInt(req.params.userId, 10);

  if (isNaN(targetId)) {
    return res.status(400).json({ success: false, error: 'Invalid user ID' });
  }

  if (currentUserId === targetId) {
    return res.status(400).json({ success: false, error: 'You cannot follow yourself' });
  }

  try {
    const target = db.prepare('SELECT id FROM users WHERE id = ?').get(targetId);
    if (!target) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    // INSERT OR IGNORE — no error on duplicate
    db.prepare(
      'INSERT OR IGNORE INTO follows (follower_id, following_id) VALUES (?, ?)'
    ).run(currentUserId, targetId);

    // Create follow notification if not already following (idempotent — ignore duplicate)
    try {
      db.prepare(
        'INSERT OR IGNORE INTO notifications (user_id, actor_id, type) VALUES (?, ?, ?)'
      ).run(targetId, currentUserId, 'follow');
    } catch {
      // notifications table may not have UNIQUE constraint — just ignore errors
    }

    const follower_count = getFollowerCount(targetId);
    return res.json({ success: true, data: { following: true, follower_count } });
  } catch (err) {
    console.error('POST /api/follows/:userId error:', err);
    return res.status(500).json({ success: false, error: 'Server error' });
  }
});

// ─── DELETE /api/follows/:userId — unfollow a user ────────────────────────────

router.delete('/:userId', requireAuth, (req, res) => {
  const currentUserId = req.session.userId;
  const targetId = parseInt(req.params.userId, 10);

  if (isNaN(targetId)) {
    return res.status(400).json({ success: false, error: 'Invalid user ID' });
  }

  try {
    db.prepare(
      'DELETE FROM follows WHERE follower_id = ? AND following_id = ?'
    ).run(currentUserId, targetId);

    const follower_count = getFollowerCount(targetId);
    return res.json({ success: true, data: { following: false, follower_count } });
  } catch (err) {
    console.error('DELETE /api/follows/:userId error:', err);
    return res.status(500).json({ success: false, error: 'Server error' });
  }
});

module.exports = router;
