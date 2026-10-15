const express = require('express');
const { body, validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const db = require('../database/db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// ─── Helpers ────────────────────────────────────────────────────────────────

function safeUser(user) {
  if (!user) return null;
  const { password_hash, ...safe } = user;
  return safe;
}

// ─── POST /api/auth/register ─────────────────────────────────────────────────

router.post(
  '/register',
  [
    body('full_name').trim().notEmpty().withMessage('Full name is required'),
    body('username')
      .trim()
      .notEmpty().withMessage('Username is required')
      .isLength({ min: 3, max: 30 }).withMessage('Username must be 3–30 characters')
      .matches(/^[a-zA-Z0-9_]+$/).withMessage('Username may only contain letters, numbers, and underscores'),
    body('email').trim().isEmail().withMessage('A valid email is required').normalizeEmail(),
    body('password')
      .isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('confirmPassword').custom((value, { req }) => {
      if (value !== req.body.password) throw new Error('Passwords do not match');
      return true;
    })
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({ success: false, error: 'Validation failed', data: errors.array() });
    }

    const { full_name, username, email, password } = req.body;

    try {
      // Check uniqueness
      const existingUsername = db.prepare('SELECT id FROM users WHERE username = ?').get(username.toLowerCase());
      if (existingUsername) {
        return res.status(409).json({ success: false, error: 'Username is already taken' });
      }

      const existingEmail = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
      if (existingEmail) {
        return res.status(409).json({ success: false, error: 'Email address is already registered' });
      }

      const password_hash = await bcrypt.hash(password, 12);

      const result = db
        .prepare(
          'INSERT INTO users (username, email, password_hash, full_name) VALUES (?, ?, ?, ?)'
        )
        .run(username.toLowerCase(), email, password_hash, full_name);

      const user = db
        .prepare(
          'SELECT id, username, email, full_name, bio, avatar, cover_image, location, website, created_at FROM users WHERE id = ?'
        )
        .get(result.lastInsertRowid);

      req.session.userId = user.id;

      return res.status(201).json({ success: true, message: 'Account created successfully', data: user });
    } catch (err) {
      console.error('Register error:', err);
      return res.status(500).json({ success: false, error: 'Server error — please try again' });
    }
  }
);

// ─── POST /api/auth/login ─────────────────────────────────────────────────────

router.post(
  '/login',
  [
    body('email').trim().isEmail().withMessage('A valid email is required').normalizeEmail(),
    body('password').notEmpty().withMessage('Password is required')
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({ success: false, error: 'Validation failed', data: errors.array() });
    }

    const { email, password } = req.body;

    try {
      const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
      if (!user) {
        return res.status(401).json({ success: false, error: 'Invalid email or password' });
      }

      const match = await bcrypt.compare(password, user.password_hash);
      if (!match) {
        return res.status(401).json({ success: false, error: 'Invalid email or password' });
      }

      req.session.userId = user.id;

      return res.json({ success: true, message: 'Logged in successfully', data: safeUser(user) });
    } catch (err) {
      console.error('Login error:', err);
      return res.status(500).json({ success: false, error: 'Server error — please try again' });
    }
  }
);

// ─── POST /api/auth/logout ────────────────────────────────────────────────────

router.post('/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) {
      return res.status(500).json({ success: false, error: 'Could not log out' });
    }
    res.clearCookie('connect.sid');
    return res.json({ success: true, message: 'Logged out successfully' });
  });
});

// ─── GET /api/auth/me ─────────────────────────────────────────────────────────

router.get('/me', requireAuth, (req, res) => {
  const user = db
    .prepare(
      'SELECT id, username, email, full_name, bio, avatar, cover_image, location, website, created_at FROM users WHERE id = ?'
    )
    .get(req.session.userId);

  if (!user) {
    return res.status(404).json({ success: false, error: 'User not found' });
  }

  return res.json({ success: true, data: user });
});

// ─── PUT /api/auth/change-password ───────────────────────────────────────────

router.put(
  '/change-password',
  requireAuth,
  [
    body('currentPassword').notEmpty().withMessage('Current password is required'),
    body('newPassword')
      .isLength({ min: 6 }).withMessage('New password must be at least 6 characters')
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({ success: false, error: errors.array()[0].msg });
    }

    const { currentPassword, newPassword } = req.body;
    const userId = req.session.userId;

    try {
      const user = db.prepare('SELECT id, password_hash FROM users WHERE id = ?').get(userId);
      if (!user) {
        return res.status(404).json({ success: false, error: 'User not found' });
      }

      const match = await bcrypt.compare(currentPassword, user.password_hash);
      if (!match) {
        return res.status(401).json({ success: false, error: 'Current password is incorrect' });
      }

      const newHash = await bcrypt.hash(newPassword, 12);
      db.prepare('UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
        .run(newHash, userId);

      return res.json({ success: true, message: 'Password changed successfully' });
    } catch (err) {
      console.error('PUT /api/auth/change-password error:', err);
      return res.status(500).json({ success: false, error: 'Server error' });
    }
  }
);

// ─── DELETE /api/auth/delete-account ─────────────────────────────────────────

router.delete('/delete-account', requireAuth, (req, res) => {
  const userId = req.session.userId;
  try {
    // Cascade deletes: FK constraints handle most, but run explicit cleanup
    // for tables that might not cascade in all SQLite configs.
    const tables = [
      'notifications', 'messages', 'bookmarks', 'likes',
      'comments', 'follows', 'posts'
    ];

    for (const table of tables) {
      // messages has both sender and receiver
      if (table === 'messages') {
        db.prepare('DELETE FROM messages WHERE sender_id = ? OR receiver_id = ?').run(userId, userId);
      } else if (table === 'follows') {
        db.prepare('DELETE FROM follows WHERE follower_id = ? OR following_id = ?').run(userId, userId);
      } else if (table === 'notifications') {
        db.prepare('DELETE FROM notifications WHERE user_id = ? OR actor_id = ?').run(userId, userId);
      } else {
        db.prepare(`DELETE FROM ${table} WHERE user_id = ?`).run(userId);
      }
    }

    db.prepare('DELETE FROM users WHERE id = ?').run(userId);

    req.session.destroy(err => {
      if (err) {
        return res.status(500).json({ success: false, error: 'Account deleted but session cleanup failed' });
      }
      res.clearCookie('connect.sid');
      return res.json({ success: true, message: 'Account deleted successfully' });
    });
  } catch (err) {
    console.error('DELETE /api/auth/delete-account error:', err);
    return res.status(500).json({ success: false, error: 'Server error' });
  }
});

module.exports = router;
