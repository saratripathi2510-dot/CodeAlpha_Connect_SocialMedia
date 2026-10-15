const express = require('express');
const db = require('../database/db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// ─── GET /api/notifications ───────────────────────────────────────────────────

router.get('/', requireAuth, (req, res) => {
  const userId = req.session.userId;
  try {
    const notifications = db.prepare(`
      SELECT
        n.id,
        n.type,
        n.read,
        n.created_at,
        n.post_id,
        n.comment_id,
        actor.id        AS actor_id,
        actor.username  AS actor_username,
        actor.full_name AS actor_name,
        actor.avatar    AS actor_avatar,
        SUBSTR(p.content, 1, 80) AS post_snippet
      FROM notifications n
      JOIN users actor ON actor.id = n.actor_id
      LEFT JOIN posts p ON p.id = n.post_id
      WHERE n.user_id = ?
      ORDER BY n.created_at DESC
      LIMIT 50
    `).all(userId);

    return res.json({ success: true, data: notifications });
  } catch (err) {
    console.error('GET /api/notifications error:', err);
    return res.status(500).json({ success: false, error: 'Server error' });
  }
});

// ─── GET /api/notifications/unread-count ─────────────────────────────────────

router.get('/unread-count', requireAuth, (req, res) => {
  const userId = req.session.userId;
  try {
    const row = db.prepare(
      'SELECT COUNT(*) AS count FROM notifications WHERE user_id = ? AND read = 0'
    ).get(userId);
    return res.json({ success: true, data: { count: row ? row.count : 0 } });
  } catch (err) {
    console.error('GET /api/notifications/unread-count error:', err);
    return res.status(500).json({ success: false, error: 'Server error' });
  }
});

// ─── PUT /api/notifications/mark-read ────────────────────────────────────────

router.put('/mark-read', requireAuth, (req, res) => {
  const userId = req.session.userId;
  try {
    db.prepare(
      'UPDATE notifications SET read = 1 WHERE user_id = ?'
    ).run(userId);
    return res.json({ success: true, message: 'All notifications marked as read' });
  } catch (err) {
    console.error('PUT /api/notifications/mark-read error:', err);
    return res.status(500).json({ success: false, error: 'Server error' });
  }
});

// ─── PUT /api/notifications/:id/read ─────────────────────────────────────────

router.put('/:id/read', requireAuth, (req, res) => {
  const userId = req.session.userId;
  const notifId = parseInt(req.params.id, 10);
  if (!notifId) return res.status(400).json({ success: false, error: 'Invalid notification id' });

  try {
    db.prepare(
      'UPDATE notifications SET read = 1 WHERE id = ? AND user_id = ?'
    ).run(notifId, userId);
    return res.json({ success: true, message: 'Notification marked as read' });
  } catch (err) {
    console.error('PUT /api/notifications/:id/read error:', err);
    return res.status(500).json({ success: false, error: 'Server error' });
  }
});

module.exports = router;
