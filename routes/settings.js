const express = require('express');
const router = express.Router();
const db = require('../database/db');
const { requireAuth } = require('../middleware/auth');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Avatar upload config
const avatarStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '../public/uploads/avatars');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `avatar_${req.session.userId}_${Date.now()}${ext}`);
  }
});
const coverStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '../public/uploads/covers');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `cover_${req.session.userId}_${Date.now()}${ext}`);
  }
});
const avatarUpload = multer({
  storage: avatarStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (/jpeg|jpg|png|gif|webp/.test(file.mimetype)) cb(null, true);
    else cb(new Error('Only image files allowed'));
  }
});
const coverUpload = multer({
  storage: coverStorage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (/jpeg|jpg|png|gif|webp/.test(file.mimetype)) cb(null, true);
    else cb(new Error('Only image files allowed'));
  }
});

function getCurrentUser(userId) {
  return db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
}

// GET /settings
router.get('/settings', requireAuth, (req, res) => {
  const currentUser = getCurrentUser(req.session.userId);
  res.render('settings', {
    title: 'Settings — Connect',
    currentUser,
    error: req.session.flash_error || null,
    success: req.session.flash_success || null,
    activeSection: req.query.section || 'profile'
  });
  delete req.session.flash_error;
  delete req.session.flash_success;
});

// POST /settings/profile — Update profile
router.post('/settings/profile', requireAuth, (req, res) => {
  const { display_name, bio, location, website } = req.body;
  if (!display_name || !display_name.trim()) {
    req.session.flash_error = 'Display name is required.';
    return res.redirect('/settings');
  }

  db.prepare(
    'UPDATE users SET display_name = ?, bio = ?, location = ?, website = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
  ).run(display_name.trim(), bio || null, location || null, website || null, req.session.userId);

  req.session.flash_success = 'Profile updated successfully.';
  res.redirect('/settings');
});

// POST /settings/avatar — Update avatar
router.post('/settings/avatar', requireAuth, avatarUpload.single('avatar'), (req, res) => {
  if (!req.file) {
    req.session.flash_error = 'Please select an image file.';
    return res.redirect('/settings');
  }

  const avatarUrl = '/uploads/avatars/' + req.file.filename;

  // Delete old avatar if exists
  const user = db.prepare('SELECT avatar_url FROM users WHERE id = ?').get(req.session.userId);
  if (user.avatar_url && user.avatar_url.startsWith('/uploads/')) {
    const oldPath = path.join(__dirname, '../public', user.avatar_url);
    if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
  }

  db.prepare('UPDATE users SET avatar_url = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(avatarUrl, req.session.userId);
  req.session.flash_success = 'Profile photo updated.';
  res.redirect('/settings');
});

// POST /settings/cover — Update cover photo
router.post('/settings/cover', requireAuth, coverUpload.single('cover'), (req, res) => {
  if (!req.file) {
    req.session.flash_error = 'Please select an image file.';
    return res.redirect('/settings');
  }

  const coverUrl = '/uploads/covers/' + req.file.filename;

  const user = db.prepare('SELECT cover_url FROM users WHERE id = ?').get(req.session.userId);
  if (user.cover_url && user.cover_url.startsWith('/uploads/')) {
    const oldPath = path.join(__dirname, '../public', user.cover_url);
    if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
  }

  db.prepare('UPDATE users SET cover_url = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(coverUrl, req.session.userId);
  req.session.flash_success = 'Cover photo updated.';
  res.redirect('/settings');
});

// POST /settings/password — Change password
router.post('/settings/password', requireAuth, (req, res) => {
  const { current_password, new_password, confirm_password } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.session.userId);

  if (!bcrypt.compareSync(current_password, user.password_hash)) {
    req.session.flash_error = 'Current password is incorrect.';
    return res.redirect('/settings?section=account');
  }
  if (new_password !== confirm_password) {
    req.session.flash_error = 'New passwords do not match.';
    return res.redirect('/settings?section=account');
  }
  if (new_password.length < 6) {
    req.session.flash_error = 'Password must be at least 6 characters.';
    return res.redirect('/settings?section=account');
  }

  const newHash = bcrypt.hashSync(new_password, 12);
  db.prepare('UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(newHash, req.session.userId);
  req.session.flash_success = 'Password changed successfully.';
  res.redirect('/settings?section=account');
});

// POST /settings/delete-account
router.post('/settings/delete-account', requireAuth, (req, res) => {
  const { password } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.session.userId);
  if (!bcrypt.compareSync(password, user.password_hash)) {
    req.session.flash_error = 'Incorrect password. Account not deleted.';
    return res.redirect('/settings?section=account');
  }

  db.prepare('DELETE FROM users WHERE id = ?').run(req.session.userId);
  req.session.destroy(() => res.redirect('/login'));
});

module.exports = router;
