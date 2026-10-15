const express = require('express');
const { body, validationResult } = require('express-validator');
const db = require('../database/db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// ─── GET /api/messages/conversations ─────────────────────────────────────────
// Returns a list of unique conversation partners with last message + unread count

router.get('/conversations', requireAuth, (req, res) => {
  const userId = req.session.userId;
  try {
    // Find distinct conversation partners and pull the latest message per pair
    const conversations = db.prepare(`
      SELECT
        partner.id           AS partner_id,
        partner.username     AS partner_username,
        partner.full_name    AS partner_name,
        partner.avatar       AS partner_avatar,
        last_msg.content     AS last_message,
        last_msg.created_at  AS last_message_at,
        last_msg.sender_id   AS last_sender_id,
        (
          SELECT COUNT(*) FROM messages
          WHERE sender_id = partner.id AND receiver_id = ? AND read = 0
        ) AS unread_count
      FROM (
        SELECT
          CASE WHEN sender_id = ? THEN receiver_id ELSE sender_id END AS partner_id,
          MAX(id) AS last_id
        FROM messages
        WHERE sender_id = ? OR receiver_id = ?
        GROUP BY partner_id
      ) AS convs
      JOIN users partner ON partner.id = convs.partner_id
      JOIN messages last_msg ON last_msg.id = convs.last_id
      ORDER BY last_msg.created_at DESC
    `).all(userId, userId, userId, userId);

    return res.json({ success: true, data: conversations });
  } catch (err) {
    console.error('GET /api/messages/conversations error:', err);
    return res.status(500).json({ success: false, error: 'Server error' });
  }
});

// ─── GET /api/messages/conversation/:userId ───────────────────────────────────
// Returns all messages between current user and :userId, ASC order

router.get('/conversation/:userId', requireAuth, (req, res) => {
  const myId = req.session.userId;
  const otherId = parseInt(req.params.userId, 10);
  if (!otherId || isNaN(otherId)) {
    return res.status(400).json({ success: false, error: 'Invalid user id' });
  }

  try {
    const messages = db.prepare(`
      SELECT
        m.id, m.content, m.read, m.created_at,
        m.sender_id, m.receiver_id,
        s.username  AS sender_username,
        s.full_name AS sender_name,
        s.avatar    AS sender_avatar
      FROM messages m
      JOIN users s ON s.id = m.sender_id
      WHERE (m.sender_id = ? AND m.receiver_id = ?)
         OR (m.sender_id = ? AND m.receiver_id = ?)
      ORDER BY m.created_at ASC
    `).all(myId, otherId, otherId, myId);

    return res.json({ success: true, data: messages });
  } catch (err) {
    console.error('GET /api/messages/conversation/:userId error:', err);
    return res.status(500).json({ success: false, error: 'Server error' });
  }
});

// ─── POST /api/messages/send ──────────────────────────────────────────────────

router.post(
  '/send',
  requireAuth,
  [
    body('receiver_id').isInt({ min: 1 }).withMessage('Invalid receiver'),
    body('content')
      .trim()
      .isLength({ min: 1, max: 1000 })
      .withMessage('Message must be 1–1000 characters')
  ],
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({ success: false, error: errors.array()[0].msg });
    }

    const senderId = req.session.userId;
    const { receiver_id, content } = req.body;
    const receiverId = parseInt(receiver_id, 10);

    if (receiverId === senderId) {
      return res.status(400).json({ success: false, error: 'Cannot send a message to yourself' });
    }

    try {
      const receiver = db.prepare('SELECT id FROM users WHERE id = ?').get(receiverId);
      if (!receiver) {
        return res.status(404).json({ success: false, error: 'Receiver not found' });
      }

      const result = db.prepare(
        'INSERT INTO messages (sender_id, receiver_id, content) VALUES (?, ?, ?)'
      ).run(senderId, receiverId, content.trim());

      const message = db.prepare(`
        SELECT
          m.id, m.content, m.read, m.created_at,
          m.sender_id, m.receiver_id,
          s.username  AS sender_username,
          s.full_name AS sender_name,
          s.avatar    AS sender_avatar
        FROM messages m
        JOIN users s ON s.id = m.sender_id
        WHERE m.id = ?
      `).get(result.lastInsertRowid);

      return res.status(201).json({ success: true, data: message });
    } catch (err) {
      console.error('POST /api/messages/send error:', err);
      return res.status(500).json({ success: false, error: 'Server error' });
    }
  }
);

// ─── PUT /api/messages/conversation/:userId/read ──────────────────────────────
// Mark all messages from :userId to current user as read

router.put('/conversation/:userId/read', requireAuth, (req, res) => {
  const myId = req.session.userId;
  const otherId = parseInt(req.params.userId, 10);
  if (!otherId || isNaN(otherId)) {
    return res.status(400).json({ success: false, error: 'Invalid user id' });
  }

  try {
    db.prepare(
      'UPDATE messages SET read = 1 WHERE sender_id = ? AND receiver_id = ? AND read = 0'
    ).run(otherId, myId);
    return res.json({ success: true, message: 'Messages marked as read' });
  } catch (err) {
    console.error('PUT /api/messages/conversation/:userId/read error:', err);
    return res.status(500).json({ success: false, error: 'Server error' });
  }
});

module.exports = router;
