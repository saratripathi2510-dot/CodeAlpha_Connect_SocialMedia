const db = require('../database/db');

/**
 * requireAuth — blocks unauthenticated requests with 401.
 */
function requireAuth(req, res, next) {
  if (req.session && req.session.userId) {
    return next();
  }
  return res.status(401).json({ success: false, error: 'Authentication required' });
}

/**
 * optionalAuth — if a session exists, attaches req.user; always calls next().
 */
function optionalAuth(req, res, next) {
  if (req.session && req.session.userId) {
    const user = db
      .prepare(
        'SELECT id, username, email, full_name, bio, avatar, cover_image, location, website, created_at FROM users WHERE id = ?'
      )
      .get(req.session.userId);
    if (user) {
      req.user = user;
    }
  }
  return next();
}

module.exports = { requireAuth, optionalAuth };
