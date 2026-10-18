const express = require('express');
const router = express.Router();
const db = require('../database/db');
const { requireAuth } = require('../middleware/auth');
const path = require('path');
const fs = require('fs');

// Helper: resolve current user
function getCurrentUser(userId) {
  return db.prepare('SELECT id, username, display_name, avatar_url FROM users WHERE id = ?').get(userId);
}

// GET / — Home Feed
router.get('/', requireAuth, (req, res) => {
  const currentUser = getCurrentUser(req.session.userId);
  const page = parseInt(req.query.page) || 1;
  const limit = 20;
  const offset = (page - 1) * limit;

  // Get posts from followed users + own posts
  const posts = db.prepare(`
    SELECT p.*, u.username, u.display_name, u.avatar_url,
      (SELECT COUNT(*) FROM likes WHERE post_id = p.id) as like_count,
      (SELECT COUNT(*) FROM comments WHERE post_id = p.id) as comment_count,
      (SELECT COUNT(*) FROM bookmarks WHERE post_id = p.id) as bookmark_count,
      (SELECT 1 FROM likes WHERE post_id = p.id AND user_id = ?) as is_liked,
      (SELECT 1 FROM bookmarks WHERE post_id = p.id AND user_id = ?) as is_bookmarked
    FROM posts p
    JOIN users u ON p.user_id = u.id
    WHERE p.user_id = ?
      OR p.user_id IN (SELECT following_id FROM follows WHERE follower_id = ?)
    ORDER BY p.created_at DESC
    LIMIT ? OFFSET ?
  `).all(req.session.userId, req.session.userId, req.session.userId, req.session.userId, limit, offset);

  // Stories: users the current user follows who posted recently
  const stories = db.prepare(`
    SELECT DISTINCT u.id, u.username, u.display_name, u.avatar_url
    FROM users u
    JOIN follows f ON f.following_id = u.id
    WHERE f.follower_id = ?
    LIMIT 15
  `).all(req.session.userId);

  // Trending topics (hashtags extracted from post content)
  const trending = db.prepare(`
    SELECT substr(content, instr(content, '#')) as tag, COUNT(*) as count
    FROM posts
    WHERE content LIKE '%#%'
      AND created_at > datetime('now', '-7 days')
    GROUP BY tag
    LIMIT 5
  `).all();

  // Suggested users (not yet followed)
  const suggested = db.prepare(`
    SELECT u.id, u.username, u.display_name, u.avatar_url,
      (SELECT COUNT(*) FROM follows WHERE following_id = u.id) as follower_count
    FROM users u
    WHERE u.id != ?
      AND u.id NOT IN (SELECT following_id FROM follows WHERE follower_id = ?)
    ORDER BY follower_count DESC
    LIMIT 5
  `).all(req.session.userId, req.session.userId);

  const flash_success = req.session.flash_success || null;
  delete req.session.flash_success;

  res.render('feed', {
    title: 'Home — Connect',
    currentUser,
    posts,
    stories,
    trending,
    suggested,
    page,
    flash_success
  });
});

module.exports = router;
