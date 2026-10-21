const express = require('express');
const router = express.Router();
const db = require('../database/db');
const { requireAuth } = require('../middleware/auth');
const bcrypt = require('bcryptjs');
const { avatarUpload, coverUpload } = require('../middleware/upload');
const { uploadMedia, deleteMedia } = require('../services/cloudinary');

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
router.post('/settings/avatar', requireAuth, avatarUpload.single('avatar'), async (req, res) => {
  if (!req.file) {
    req.session.flash_error = 'Please select an image file.';
    return res.redirect('/settings');
  }

  try {
    const user = db.prepare('SELECT avatar_url FROM users WHERE id = ?').get(req.session.userId);

    const uploadResult = await uploadMedia(req.file.buffer, {
      folder: 'connect/avatars',
      resource_type: 'image',
      originalname: req.file.originalname
    });

    // Delete old avatar if exists
    if (user && user.avatar_url) {
      await deleteMedia(user.avatar_url, 'image');
    }

    db.prepare('UPDATE users SET avatar_url = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(uploadResult.url, req.session.userId);
    req.session.flash_success = 'Profile photo updated.';
  } catch (err) {
    console.error('Avatar upload error:', err);
    req.session.flash_error = 'Failed to upload profile photo.';
  }

  res.redirect('/settings');
});

// POST /settings/cover — Update cover photo
router.post('/settings/cover', requireAuth, coverUpload.single('cover'), async (req, res) => {
  if (!req.file) {
    req.session.flash_error = 'Please select an image file.';
    return res.redirect('/settings');
  }

  try {
    const user = db.prepare('SELECT cover_url FROM users WHERE id = ?').get(req.session.userId);

    const uploadResult = await uploadMedia(req.file.buffer, {
      folder: 'connect/covers',
      resource_type: 'image',
      originalname: req.file.originalname
    });

    if (user && user.cover_url) {
      await deleteMedia(user.cover_url, 'image');
    }

    db.prepare('UPDATE users SET cover_url = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(uploadResult.url, req.session.userId);
    req.session.flash_success = 'Cover photo updated.';
  } catch (err) {
    console.error('Cover photo upload error:', err);
    req.session.flash_error = 'Failed to upload cover photo.';
  }

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
