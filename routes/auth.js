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

module.exports = router;
