const express = require('express');
const path = require('path');
const fs = require('fs');
const { body, validationResult } = require('express-validator');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const db = require('../database/db');
const { requireAuth, optionalAuth } = require('../middleware/auth');

const router = express.Router();

// ─── Multer config for avatar + cover in one request ─────────────────────────

const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');
const MAX_FILE_SIZE = parseInt(process.env.MAX_FILE_SIZE, 10) || 5 * 1024 * 1024;
const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

const storage = multer.diskStorage({
  destination(req, file, cb) { cb(null, UPLOADS_DIR); },
  filename(req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, uuidv4() + ext);
  }
});

function fileFilter(req, file, cb) {
  if (ALLOWED_MIME.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new multer.MulterError('LIMIT_UNEXPECTED_FILE', 'Only JPEG, PNG, GIF, and WebP are allowed'));
  }
}

const profileUpload = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_FILE_SIZE }
}).fields([
  { name: 'avatar', maxCount: 1 },
  { name: 'cover',  maxCount: 1 }
]);

// ─── Helper: safe user object (no password_hash) ──────────────────────────────

function safeUser(u) {
  if (!u) return null;
  const { password_hash, ...rest } = u;
  return rest;
}

// ─── GET /api/users/suggestions ───────────────────────────────────────────────

router.get('/suggestions', requireAuth, (req, res) => {
  const currentUserId = req.session.userId;
  try {
    const users = db.prepare(`
      SELECT
        u.id, u.username, u.full_name, u.avatar, u.bio,
        (SELECT COUNT(*) FROM follows WHERE following_id = u.id) AS follower_count
      FROM users u
      WHERE u.id != ?
        AND u.id NOT IN (
          SELECT following_id FROM follows WHERE follower_id = ?
        )
      ORDER BY follower_count DESC
      LIMIT 8
    `).all(currentUserId, currentUserId);

    return res.json({ success: true, data: users });
  } catch (err) {
    console.error('GET /api/users/suggestions error:', err);
    return res.status(500).json({ success: false, error: 'Server error' });
  }
});

// ─── GET /api/users/:username ─────────────────────────────────────────────────

router.get('/:username', optionalAuth, (req, res) => {
  const { username } = req.params;
  const currentUserId = req.session && req.session.userId ? req.session.userId : null;

  try {
    const user = db.prepare(`
      SELECT
        u.id, u.username, u.email, u.full_name, u.bio, u.avatar,
        u.cover_image, u.location, u.website, u.created_at,
        (SELECT COUNT(*) FROM posts    WHERE user_id      = u.id) AS post_count,
        (SELECT COUNT(*) FROM follows  WHERE following_id = u.id) AS follower_count,
        (SELECT COUNT(*) FROM follows  WHERE follower_id  = u.id) AS following_count
      FROM users u
      WHERE LOWER(u.username) = LOWER(?)
    `).get(username);

    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    let is_following = false;
    if (currentUserId) {
      const row = db.prepare(
        'SELECT 1 FROM follows WHERE follower_id = ? AND following_id = ?'
      ).get(currentUserId, user.id);
      is_following = !!row;
    }

    return res.json({ success: true, data: { ...user, is_following } });
  } catch (err) {
    console.error('GET /api/users/:username error:', err);
    return res.status(500).json({ success: false, error: 'Server error' });
  }
});

// ─── GET /api/users/:username/posts ──────────────────────────────────────────

router.get('/:username/posts', optionalAuth, (req, res) => {
  const { username } = req.params;
  const currentUserId = req.session && req.session.userId ? req.session.userId : null;
  const page  = Math.max(1, parseInt(req.query.page,  10) || 1);
  const limit = Math.min(50, parseInt(req.query.limit, 10) || 20);
  const offset = (page - 1) * limit;

  try {
    const owner = db.prepare('SELECT id FROM users WHERE LOWER(username) = LOWER(?)').get(username);
    if (!owner) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    const likedSub = currentUserId
      ? `(SELECT COUNT(*) FROM likes WHERE likes.post_id = p.id AND likes.user_id = ${Number(currentUserId)})`
      : '0';
    const bookmarkedSub = currentUserId
      ? `(SELECT COUNT(*) FROM bookmarks WHERE bookmarks.post_id = p.id AND bookmarks.user_id = ${Number(currentUserId)})`
      : '0';

    const posts = db.prepare(`
      SELECT
        p.id, p.user_id, p.content, p.image, p.created_at, p.updated_at,
        u.username, u.full_name, u.avatar,
        (SELECT COUNT(*) FROM likes    WHERE likes.post_id    = p.id) AS like_count,
        (SELECT COUNT(*) FROM comments WHERE comments.post_id = p.id) AS comment_count,
        ${likedSub}      AS is_liked,
        ${bookmarkedSub} AS is_bookmarked
      FROM posts p
      JOIN users u ON u.id = p.user_id
      WHERE p.user_id = ?
      ORDER BY p.created_at DESC
      LIMIT ? OFFSET ?
    `).all(owner.id, limit, offset);

    return res.json({ success: true, data: posts });
  } catch (err) {
    console.error('GET /api/users/:username/posts error:', err);
    return res.status(500).json({ success: false, error: 'Server error' });
  }
});

// ─── GET /api/users/:username/followers ──────────────────────────────────────

router.get('/:username/followers', optionalAuth, (req, res) => {
  const { username } = req.params;
  const currentUserId = req.session && req.session.userId ? req.session.userId : null;

  try {
    const owner = db.prepare('SELECT id FROM users WHERE LOWER(username) = LOWER(?)').get(username);
    if (!owner) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    const followers = db.prepare(`
      SELECT
        u.id, u.username, u.full_name, u.avatar, u.bio,
        ${currentUserId
          ? `(SELECT COUNT(*) FROM follows WHERE follower_id = ${Number(currentUserId)} AND following_id = u.id)`
          : '0'} AS is_following
      FROM follows f
      JOIN users u ON u.id = f.follower_id
      WHERE f.following_id = ?
      ORDER BY f.created_at DESC
    `).all(owner.id);

    return res.json({ success: true, data: followers });
  } catch (err) {
    console.error('GET /api/users/:username/followers error:', err);
    return res.status(500).json({ success: false, error: 'Server error' });
  }
});

// ─── GET /api/users/:username/following ──────────────────────────────────────

router.get('/:username/following', optionalAuth, (req, res) => {
  const { username } = req.params;
  const currentUserId = req.session && req.session.userId ? req.session.userId : null;

  try {
    const owner = db.prepare('SELECT id FROM users WHERE LOWER(username) = LOWER(?)').get(username);
    if (!owner) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    const following = db.prepare(`
      SELECT
        u.id, u.username, u.full_name, u.avatar, u.bio,
        ${currentUserId
          ? `(SELECT COUNT(*) FROM follows WHERE follower_id = ${Number(currentUserId)} AND following_id = u.id)`
          : '0'} AS is_following
      FROM follows f
      JOIN users u ON u.id = f.following_id
      WHERE f.follower_id = ?
      ORDER BY f.created_at DESC
    `).all(owner.id);

    return res.json({ success: true, data: following });
  } catch (err) {
    console.error('GET /api/users/:username/following error:', err);
    return res.status(500).json({ success: false, error: 'Server error' });
  }
});

// ─── PUT /api/users/me — update own profile ───────────────────────────────────

router.put('/me', requireAuth, (req, res) => {
  profileUpload(req, res, async (uploadErr) => {
    if (uploadErr) {
      return res.status(400).json({ success: false, error: uploadErr.message });
    }

    const currentUserId = req.session.userId;
    const { full_name, bio, location, website } = req.body;

    // Validate
    if (full_name !== undefined && (!full_name || !full_name.trim())) {
      return res.status(422).json({ success: false, error: 'Full name cannot be empty' });
    }

    try {
      const existing = db.prepare(
        'SELECT id, avatar, cover_image FROM users WHERE id = ?'
      ).get(currentUserId);

      if (!existing) {
        return res.status(404).json({ success: false, error: 'User not found' });
      }

      let newAvatar    = existing.avatar;
      let newCoverImage = existing.cover_image;

      // Handle new avatar upload
      if (req.files && req.files.avatar && req.files.avatar[0]) {
        const file = req.files.avatar[0];
        const newPath = `/uploads/${file.filename}`;
        // Delete old avatar file if it exists
        if (existing.avatar && existing.avatar.startsWith('/uploads/')) {
          const oldPath = path.join(__dirname, '..', existing.avatar);
          if (fs.existsSync(oldPath)) fs.unlink(oldPath, () => {});
        }
        newAvatar = newPath;
      }

      // Handle new cover upload
      if (req.files && req.files.cover && req.files.cover[0]) {
        const file = req.files.cover[0];
        const newPath = `/uploads/${file.filename}`;
        // Delete old cover file if it exists
        if (existing.cover_image && existing.cover_image.startsWith('/uploads/')) {
          const oldPath = path.join(__dirname, '..', existing.cover_image);
          if (fs.existsSync(oldPath)) fs.unlink(oldPath, () => {});
        }
        newCoverImage = newPath;
      }

      db.prepare(`
        UPDATE users SET
          full_name    = COALESCE(NULLIF(?, ''), full_name),
          bio          = CASE WHEN ? IS NOT NULL THEN ? ELSE bio END,
          location     = CASE WHEN ? IS NOT NULL THEN ? ELSE location END,
          website      = CASE WHEN ? IS NOT NULL THEN ? ELSE website END,
          avatar       = ?,
          cover_image  = ?,
          updated_at   = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(
        full_name ? full_name.trim() : '',
        bio !== undefined ? bio : null, bio !== undefined ? (bio || '') : null,
        location !== undefined ? location : null, location !== undefined ? (location || '') : null,
        website  !== undefined ? website  : null, website  !== undefined ? (website  || '') : null,
        newAvatar,
        newCoverImage,
        currentUserId
      );

      const updated = db.prepare(
        'SELECT id, username, email, full_name, bio, avatar, cover_image, location, website, created_at FROM users WHERE id = ?'
      ).get(currentUserId);

      return res.json({ success: true, data: updated, message: 'Profile updated' });
    } catch (err) {
      console.error('PUT /api/users/me error:', err);
      return res.status(500).json({ success: false, error: 'Server error' });
    }
  });
});

module.exports = router;
