const express = require('express');
const router = express.Router();
const db = require('../database/db');
const { requireAuth } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');

// Avatar upload
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
const avatarUpload = multer({ storage: avatarStorage, limits: { fileSize: 5 * 1024 * 1024 } });
const coverUpload = multer({ storage: coverStorage, limits: { fileSize: 10 * 1024 * 1024 } });

function getCurrentUser(userId) {
  return db.prepare('SELECT id, username, display_name, avatar_url FROM users WHERE id = ?').get(userId);
}

// GET /u/:username — Profile
router.get('/u/:username', requireAuth, (req, res) => {
  const currentUser = getCurrentUser(req.session.userId);
  const profile = db.prepare('SELECT * FROM users WHERE username = ?').get(req.params.username);
  if (!profile) return res.status(404).render('error', { title: 'User Not Found', code: 404, message: 'This user does not exist.', currentUser });

  const posts = db.prepare(`
    SELECT p.*, u.username, u.display_name, u.avatar_url,
      (SELECT COUNT(*) FROM likes WHERE post_id = p.id) as like_count,
      (SELECT COUNT(*) FROM comments WHERE post_id = p.id) as comment_count,
      (SELECT 1 FROM likes WHERE post_id = p.id AND user_id = ?) as is_liked,
      (SELECT 1 FROM bookmarks WHERE post_id = p.id AND user_id = ?) as is_bookmarked
    FROM posts p
    JOIN users u ON p.user_id = u.id
    WHERE p.user_id = ?
    ORDER BY p.created_at DESC
  `).all(req.session.userId, req.session.userId, profile.id);

  const savedPosts = db.prepare(`
    SELECT p.*, u.username, u.display_name, u.avatar_url,
      (SELECT COUNT(*) FROM likes WHERE post_id = p.id) as like_count,
      (SELECT COUNT(*) FROM comments WHERE post_id = p.id) as comment_count,
      (SELECT 1 FROM likes WHERE post_id = p.id AND user_id = ?) as is_liked,
      (SELECT 1 FROM bookmarks WHERE post_id = p.id AND user_id = ?) as is_bookmarked
    FROM bookmarks b
    JOIN posts p ON b.post_id = p.id
    JOIN users u ON p.user_id = u.id
    WHERE b.user_id = ?
    ORDER BY b.created_at DESC
  `).all(req.session.userId, req.session.userId, profile.id);

  const followerCount = db.prepare('SELECT COUNT(*) as c FROM follows WHERE following_id = ?').get(profile.id).c;
  const followingCount = db.prepare('SELECT COUNT(*) as c FROM follows WHERE follower_id = ?').get(profile.id).c;
  const isFollowing = !!db.prepare('SELECT 1 FROM follows WHERE follower_id = ? AND following_id = ?').get(req.session.userId, profile.id);
  const isOwnProfile = req.session.userId === profile.id;

  res.render('profile', {
    title: `${profile.display_name} (@${profile.username}) — Connect`,
    currentUser,
    profile,
    posts,
    savedPosts,
    followerCount,
    followingCount,
    isFollowing,
    isOwnProfile,
    activeTab: req.query.tab || 'posts'
  });
});

// POST /u/:username/follow — Toggle follow
router.post('/u/:username/follow', requireAuth, (req, res) => {
  const target = db.prepare('SELECT id FROM users WHERE username = ?').get(req.params.username);
  if (!target || target.id === req.session.userId) return res.redirect(`/u/${req.params.username}`);

  const existing = db.prepare('SELECT 1 FROM follows WHERE follower_id = ? AND following_id = ?').get(req.session.userId, target.id);
  if (existing) {
    db.prepare('DELETE FROM follows WHERE follower_id = ? AND following_id = ?').run(req.session.userId, target.id);
  } else {
    db.prepare('INSERT OR IGNORE INTO follows (follower_id, following_id) VALUES (?, ?)').run(req.session.userId, target.id);
    // Notify
    db.prepare('INSERT OR IGNORE INTO notifications (user_id, actor_id, type) VALUES (?, ?, ?)').run(target.id, req.session.userId, 'follow');
  }

  res.redirect(`/u/${req.params.username}`);
});

module.exports = router;
