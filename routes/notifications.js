const express = require('express');
const router = express.Router();
const db = require('../database/db');
const { requireAuth } = require('../middleware/auth');

function getCurrentUser(userId) {
  return db.prepare('SELECT id, username, display_name, avatar_url FROM users WHERE id = ?').get(userId);
}

// GET /notifications
router.get('/notifications', requireAuth, (req, res) => {
  const currentUser = getCurrentUser(req.session.userId);

  const notifications = db.prepare(`
    SELECT n.*, 
      actor.username as actor_username,
      actor.display_name as actor_display_name,
      actor.avatar_url as actor_avatar_url,
      p.content as post_content,
      p.media_url as post_media_url
    FROM notifications n
    JOIN users actor ON actor.id = n.actor_id
    LEFT JOIN posts p ON p.id = n.post_id
    WHERE n.user_id = ?
    ORDER BY n.created_at DESC
    LIMIT 50
  `).all(req.session.userId);

  // Mark all as read
  db.prepare('UPDATE notifications SET read_at = CURRENT_TIMESTAMP WHERE user_id = ? AND read_at IS NULL').run(req.session.userId);

  res.render('notifications', {
    title: 'Notifications — Connect',
    currentUser,
    notifications
  });
});

// POST /notifications/read-all
router.post('/notifications/read-all', requireAuth, (req, res) => {
  db.prepare('UPDATE notifications SET read_at = CURRENT_TIMESTAMP WHERE user_id = ? AND read_at IS NULL').run(req.session.userId);
  res.redirect('/notifications');
});

// GET /api/notifications/count
router.get('/api/notifications/count', requireAuth, (req, res) => {
  const count = db.prepare('SELECT COUNT(*) as c FROM notifications WHERE user_id = ? AND read_at IS NULL').get(req.session.userId).c;
  res.json({ count });
});

module.exports = router;
