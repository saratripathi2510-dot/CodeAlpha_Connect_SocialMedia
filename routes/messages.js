const express = require('express');
const router = express.Router();
const db = require('../database/db');
const { requireAuth } = require('../middleware/auth');

function getCurrentUser(userId) {
  return db.prepare('SELECT id, username, display_name, avatar_url FROM users WHERE id = ?').get(userId);
}

// GET /messages — Conversation list
router.get('/messages', requireAuth, (req, res) => {
  const currentUser = getCurrentUser(req.session.userId);

  // Get all conversations (distinct users)
  const conversations = db.prepare(`
    SELECT DISTINCT
      CASE WHEN m.sender_id = ? THEN m.receiver_id ELSE m.sender_id END as other_user_id,
      u.username, u.display_name, u.avatar_url,
      (SELECT content FROM messages
        WHERE (sender_id = ? AND receiver_id = u.id) OR (sender_id = u.id AND receiver_id = ?)
        ORDER BY created_at DESC LIMIT 1) as last_message,
      (SELECT created_at FROM messages
        WHERE (sender_id = ? AND receiver_id = u.id) OR (sender_id = u.id AND receiver_id = ?)
        ORDER BY created_at DESC LIMIT 1) as last_message_at,
      (SELECT COUNT(*) FROM messages
        WHERE sender_id = u.id AND receiver_id = ? AND read_at IS NULL) as unread_count
    FROM messages m
    JOIN users u ON u.id = CASE WHEN m.sender_id = ? THEN m.receiver_id ELSE m.sender_id END
    WHERE m.sender_id = ? OR m.receiver_id = ?
    ORDER BY last_message_at DESC
  `).all(
    req.session.userId,
    req.session.userId, req.session.userId,
    req.session.userId, req.session.userId,
    req.session.userId,
    req.session.userId,
    req.session.userId, req.session.userId
  );

  res.render('messages', {
    title: 'Messages — Connect',
    currentUser,
    conversations,
    activeConversation: null,
    messages: []
  });
});

// GET /messages/:username — Open conversation
router.get('/messages/:username', requireAuth, (req, res) => {
  const currentUser = getCurrentUser(req.session.userId);
  const otherUser = db.prepare('SELECT id, username, display_name, avatar_url FROM users WHERE username = ?').get(req.params.username);
  if (!otherUser) return res.redirect('/messages');

  // Mark messages as read
  db.prepare(
    'UPDATE messages SET read_at = CURRENT_TIMESTAMP WHERE sender_id = ? AND receiver_id = ? AND read_at IS NULL'
  ).run(otherUser.id, req.session.userId);

  const messages = db.prepare(`
    SELECT m.*, u.username, u.display_name, u.avatar_url
    FROM messages m
    JOIN users u ON u.id = m.sender_id
    WHERE (m.sender_id = ? AND m.receiver_id = ?) OR (m.sender_id = ? AND m.receiver_id = ?)
    ORDER BY m.created_at ASC
  `).all(req.session.userId, otherUser.id, otherUser.id, req.session.userId);

  const conversations = db.prepare(`
    SELECT DISTINCT
      CASE WHEN m.sender_id = ? THEN m.receiver_id ELSE m.sender_id END as other_user_id,
      u.username, u.display_name, u.avatar_url,
      (SELECT content FROM messages
        WHERE (sender_id = ? AND receiver_id = u.id) OR (sender_id = u.id AND receiver_id = ?)
        ORDER BY created_at DESC LIMIT 1) as last_message,
      (SELECT created_at FROM messages
        WHERE (sender_id = ? AND receiver_id = u.id) OR (sender_id = u.id AND receiver_id = ?)
        ORDER BY created_at DESC LIMIT 1) as last_message_at,
      (SELECT COUNT(*) FROM messages
        WHERE sender_id = u.id AND receiver_id = ? AND read_at IS NULL) as unread_count
    FROM messages m
    JOIN users u ON u.id = CASE WHEN m.sender_id = ? THEN m.receiver_id ELSE m.sender_id END
    WHERE m.sender_id = ? OR m.receiver_id = ?
    ORDER BY last_message_at DESC
  `).all(
    req.session.userId,
    req.session.userId, req.session.userId,
    req.session.userId, req.session.userId,
    req.session.userId,
    req.session.userId,
    req.session.userId, req.session.userId
  );

  res.render('messages', {
    title: `Chat with ${otherUser.display_name} — Connect`,
    currentUser,
    conversations,
    activeConversation: otherUser,
    messages
  });
});

// POST /messages/:username — Send message
router.post('/messages/:username', requireAuth, (req, res) => {
  const { content } = req.body;
  const receiver = db.prepare('SELECT id FROM users WHERE username = ?').get(req.params.username);
  if (!receiver || !content || !content.trim()) return res.redirect(`/messages/${req.params.username}`);

  db.prepare('INSERT INTO messages (sender_id, receiver_id, content) VALUES (?, ?, ?)').run(req.session.userId, receiver.id, content.trim());
  res.redirect(`/messages/${req.params.username}`);
});

// GET /api/messages/count — Unread message count (JSON)
router.get('/api/messages/count', requireAuth, (req, res) => {
  const count = db.prepare('SELECT COUNT(*) as c FROM messages WHERE receiver_id = ? AND read_at IS NULL').get(req.session.userId).c;
  res.json({ count });
});

module.exports = router;
