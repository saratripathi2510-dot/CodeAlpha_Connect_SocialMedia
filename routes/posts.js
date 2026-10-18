const express = require('express');
const router = express.Router();
const db = require('../database/db');
const { requireAuth } = require('../middleware/auth');
const path = require('path');
const fs = require('fs');
const multer = require('multer');

// Configure multer for post media uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../public/uploads');
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `post_${Date.now()}_${Math.random().toString(36).substr(2, 9)}${ext}`);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|gif|webp|mp4|mov/;
    if (allowed.test(file.mimetype)) cb(null, true);
    else cb(new Error('Only images and videos are allowed.'));
  }
});

function getCurrentUser(userId) {
  return db.prepare('SELECT id, username, display_name, avatar_url FROM users WHERE id = ?').get(userId);
}

function createNotification(userId, actorId, type, postId = null) {
  if (userId === actorId) return; // Don't notify yourself
  try {
    db.prepare(
      'INSERT OR IGNORE INTO notifications (user_id, actor_id, type, post_id) VALUES (?, ?, ?, ?)'
    ).run(userId, actorId, type, postId);
  } catch (e) { /* ignore */ }
}

// POST /posts — Create post
router.post('/posts', requireAuth, upload.single('media'), (req, res) => {
  const { content } = req.body;
  if (!content || !content.trim()) {
    return res.redirect('/');
  }

  let media_url = null;
  let media_type = null;
  if (req.file) {
    media_url = '/uploads/' + req.file.filename;
    media_type = req.file.mimetype.startsWith('video') ? 'video' : 'image';
  }

  db.prepare(
    'INSERT INTO posts (user_id, content, media_url, media_type) VALUES (?, ?, ?, ?)'
  ).run(req.session.userId, content.trim(), media_url, media_type);

  res.redirect('/');
});

// GET /posts/:id — Post detail
router.get('/posts/:id', requireAuth, (req, res) => {
  const currentUser = getCurrentUser(req.session.userId);
  const post = db.prepare(`
    SELECT p.*, u.username, u.display_name, u.avatar_url,
      (SELECT COUNT(*) FROM likes WHERE post_id = p.id) as like_count,
      (SELECT COUNT(*) FROM comments WHERE post_id = p.id) as comment_count,
      (SELECT COUNT(*) FROM bookmarks WHERE post_id = p.id) as bookmark_count,
      (SELECT 1 FROM likes WHERE post_id = p.id AND user_id = ?) as is_liked,
      (SELECT 1 FROM bookmarks WHERE post_id = p.id AND user_id = ?) as is_bookmarked
    FROM posts p
    JOIN users u ON p.user_id = u.id
    WHERE p.id = ?
  `).get(req.session.userId, req.session.userId, req.params.id);

  if (!post) return res.status(404).render('error', { title: 'Post Not Found', code: 404, message: 'This post does not exist.', currentUser });

  const comments = db.prepare(`
    SELECT c.*, u.username, u.display_name, u.avatar_url
    FROM comments c
    JOIN users u ON c.user_id = u.id
    WHERE c.post_id = ?
    ORDER BY c.created_at ASC
  `).all(req.params.id);

  res.render('post-detail', {
    title: `Post by @${post.username} — Connect`,
    currentUser,
    post,
    comments
  });
});

// DELETE /posts/:id — Delete post
router.post('/posts/:id/delete', requireAuth, (req, res) => {
  const post = db.prepare('SELECT * FROM posts WHERE id = ? AND user_id = ?').get(req.params.id, req.session.userId);
  if (!post) return res.status(403).json({ error: 'Forbidden' });

  // Delete media file if exists
  if (post.media_url) {
    const filePath = path.join(__dirname, '../public', post.media_url);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  }

  db.prepare('DELETE FROM posts WHERE id = ?').run(req.params.id);
  const referer = req.get('Referer') || '/';
  const isPostPage = referer.includes(`/posts/${req.params.id}`);
  res.redirect(isPostPage ? '/' : referer);
});

// POST /posts/:id/like — Toggle like
router.post('/posts/:id/like', requireAuth, (req, res) => {
  const postId = req.params.id;
  const userId = req.session.userId;

  const post = db.prepare('SELECT user_id FROM posts WHERE id = ?').get(postId);
  if (!post) return res.json({ error: 'Not found' });

  const existing = db.prepare('SELECT id FROM likes WHERE user_id = ? AND post_id = ?').get(userId, postId);
  let liked;
  if (existing) {
    db.prepare('DELETE FROM likes WHERE user_id = ? AND post_id = ?').run(userId, postId);
    liked = false;
  } else {
    db.prepare('INSERT OR IGNORE INTO likes (user_id, post_id) VALUES (?, ?)').run(userId, postId);
    liked = true;
    createNotification(post.user_id, userId, 'like', postId);
  }

  const count = db.prepare('SELECT COUNT(*) as c FROM likes WHERE post_id = ?').get(postId).c;
  res.json({ liked, count });
});

// POST /posts/:id/bookmark — Toggle bookmark
router.post('/posts/:id/bookmark', requireAuth, (req, res) => {
  const postId = req.params.id;
  const userId = req.session.userId;

  const existing = db.prepare('SELECT id FROM bookmarks WHERE user_id = ? AND post_id = ?').get(userId, postId);
  let bookmarked;
  if (existing) {
    db.prepare('DELETE FROM bookmarks WHERE user_id = ? AND post_id = ?').run(userId, postId);
    bookmarked = false;
  } else {
    db.prepare('INSERT OR IGNORE INTO bookmarks (user_id, post_id) VALUES (?, ?)').run(userId, postId);
    bookmarked = true;
  }

  res.json({ bookmarked });
});

// POST /posts/:id/comments — Add comment
router.post('/posts/:id/comments', requireAuth, (req, res) => {
  const { content } = req.body;
  const postId = req.params.id;
  if (!content || !content.trim()) {
    return res.redirect(`/posts/${postId}`);
  }

  const post = db.prepare('SELECT user_id FROM posts WHERE id = ?').get(postId);
  if (!post) return res.redirect('/');

  db.prepare('INSERT INTO comments (user_id, post_id, content) VALUES (?, ?, ?)').run(req.session.userId, postId, content.trim());
  createNotification(post.user_id, req.session.userId, 'comment', postId);

  res.redirect(`/posts/${postId}`);
});

// POST /comments/:id/delete — Delete comment
router.post('/comments/:id/delete', requireAuth, (req, res) => {
  const comment = db.prepare('SELECT * FROM comments WHERE id = ? AND user_id = ?').get(req.params.id, req.session.userId);
  if (!comment) return res.status(403).json({ error: 'Forbidden' });
  db.prepare('DELETE FROM comments WHERE id = ?').run(req.params.id);
  res.redirect(`/posts/${comment.post_id}`);
});

module.exports = router;
