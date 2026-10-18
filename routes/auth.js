const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const db = require('../database/db');
const { requireGuest } = require('../middleware/auth');

// GET /login
router.get('/login', requireGuest, (req, res) => {
  res.render('auth/login', {
    title: 'Sign In — Connect',
    error: req.session.flash_error || null,
    success: req.session.flash_success || null,
    body_class: 'auth-page'
  });
  delete req.session.flash_error;
  delete req.session.flash_success;
});

// POST /login
router.post('/login', requireGuest, (req, res) => {
  const { identifier, password } = req.body;
  if (!identifier || !password) {
    req.session.flash_error = 'Please enter your username/email and password.';
    return res.redirect('/login');
  }

  const user = db.prepare(
    'SELECT * FROM users WHERE username = ? OR email = ?'
  ).get(identifier.trim(), identifier.trim());

  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    req.session.flash_error = 'Invalid credentials. Please try again.';
    return res.redirect('/login');
  }

  req.session.userId = user.id;
  req.session.username = user.username;
  const returnTo = req.session.returnTo || '/';
  delete req.session.returnTo;
  res.redirect(returnTo);
});

// GET /register
router.get('/register', requireGuest, (req, res) => {
  res.render('auth/register', {
    title: 'Create Account — Connect',
    error: req.session.flash_error || null,
    body_class: 'auth-page'
  });
  delete req.session.flash_error;
});

// POST /register
router.post('/register', requireGuest, (req, res) => {
  const { username, display_name, email, password, confirm_password } = req.body;

  if (!username || !display_name || !email || !password) {
    req.session.flash_error = 'All fields are required.';
    return res.redirect('/register');
  }

  if (password !== confirm_password) {
    req.session.flash_error = 'Passwords do not match.';
    return res.redirect('/register');
  }

  if (password.length < 6) {
    req.session.flash_error = 'Password must be at least 6 characters.';
    return res.redirect('/register');
  }

  if (!/^[a-zA-Z0-9_]{3,30}$/.test(username)) {
    req.session.flash_error = 'Username must be 3-30 characters and contain only letters, numbers, and underscores.';
    return res.redirect('/register');
  }

  const existingUser = db.prepare(
    'SELECT id FROM users WHERE username = ? OR email = ?'
  ).get(username.trim(), email.trim());

  if (existingUser) {
    req.session.flash_error = 'Username or email already taken.';
    return res.redirect('/register');
  }

  const passwordHash = bcrypt.hashSync(password, 12);

  try {
    const result = db.prepare(
      'INSERT INTO users (username, display_name, email, password_hash) VALUES (?, ?, ?, ?)'
    ).run(username.trim(), display_name.trim(), email.trim().toLowerCase(), passwordHash);

    req.session.userId = result.lastInsertRowid;
    req.session.username = username.trim();
    req.session.flash_success = 'Welcome to Connect! Your account has been created.';
    res.redirect('/');
  } catch (err) {
    console.error('Registration error:', err);
    req.session.flash_error = 'Something went wrong. Please try again.';
    res.redirect('/register');
  }
});

// POST /logout
router.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/login');
  });
});

module.exports = router;
