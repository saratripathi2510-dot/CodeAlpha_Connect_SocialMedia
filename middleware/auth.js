/**
 * Auth middleware — protects routes that require a logged-in session.
 */
function requireAuth(req, res, next) {
  if (req.session && req.session.userId) {
    return next();
  }
  req.session.returnTo = req.originalUrl;
  res.redirect('/login');
}

/**
 * Redirect logged-in users away from auth pages (login/register).
 */
function requireGuest(req, res, next) {
  if (req.session && req.session.userId) {
    return res.redirect('/');
  }
  next();
}

module.exports = { requireAuth, requireGuest };
