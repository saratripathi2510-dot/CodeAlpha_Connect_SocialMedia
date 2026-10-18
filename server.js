const express = require('express');
const session = require('express-session');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// ─── View Engine ────────────────────────────────────────────────────────────
// Simple template engine using HTML files with {{ }} placeholders
// We'll use a custom lightweight renderer to avoid adding dependencies.
// Actually, let's use a proper approach with string replacement.

// Custom template renderer
const viewsDir = path.join(__dirname, 'views');

function renderView(viewPath, data = {}) {
  let html = fs.readFileSync(viewPath, 'utf8');

  // Include partials: {{> partial_name}}
  html = html.replace(/\{\{>\s*(\S+)\s*\}\}/g, (match, partialName) => {
    const partialPath = path.join(viewsDir, 'partials', `${partialName}.html`);
    if (fs.existsSync(partialPath)) {
      let partial = fs.readFileSync(partialPath, 'utf8');
      return partial;
    }
    return '';
  });

  // Replace variables: {{varName}}
  html = html.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    return data[key] !== undefined ? escapeHtml(String(data[key])) : '';
  });

  return html;
}

function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

// ─── Middleware ──────────────────────────────────────────────────────────────
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

app.use(session({
  secret: process.env.SESSION_SECRET || 'connect-sage-garden-secret-2024',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false, // set true in production with HTTPS
    maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
  }
}));

// Inject current user into all responses
const db = require('./database/db');

app.use((req, res, next) => {
  if (req.session.userId) {
    res.locals.currentUser = db.prepare(
      'SELECT id, username, display_name, avatar_url FROM users WHERE id = ?'
    ).get(req.session.userId);
    res.locals.unreadNotifications = db.prepare(
      'SELECT COUNT(*) as c FROM notifications WHERE user_id = ? AND read_at IS NULL'
    ).get(req.session.userId).c;
    res.locals.unreadMessages = db.prepare(
      'SELECT COUNT(*) as c FROM messages WHERE receiver_id = ? AND read_at IS NULL'
    ).get(req.session.userId).c;
  } else {
    res.locals.currentUser = null;
    res.locals.unreadNotifications = 0;
    res.locals.unreadMessages = 0;
  }
  next();
});

// ─── Template Engine Setup ───────────────────────────────────────────────────
// Using EJS for proper template rendering
// Install ejs if not already present
try {
  require('ejs');
} catch(e) {
  console.error('EJS not found. Run: npm install ejs');
  process.exit(1);
}

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Make helpers available to all views
app.use((req, res, next) => {
  res.locals.session = req.session;
  res.locals.path = req.path;
  res.locals.formatDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now - date;
    const secs = Math.floor(diff / 1000);
    const mins = Math.floor(secs / 60);
    const hours = Math.floor(mins / 60);
    const days = Math.floor(hours / 24);
    if (secs < 60) return 'just now';
    if (mins < 60) return `${mins}m`;
    if (hours < 24) return `${hours}h`;
    if (days < 7) return `${days}d`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };
  res.locals.formatDateFull = (dateStr) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  };
  res.locals.truncate = (str, len = 100) => {
    if (!str) return '';
    return str.length > len ? str.substring(0, len) + '...' : str;
  };
  res.locals.avatarUrl = (user) => {
    if (user && user.avatar_url) return user.avatar_url;
    const name = user ? (user.display_name || user.username || 'U') : 'U';
    return `/images/avatar-placeholder.svg`;
  };
  next();
});

// ─── Routes ─────────────────────────────────────────────────────────────────
app.use('/', require('./routes/auth'));
app.use('/', require('./routes/feed'));
app.use('/', require('./routes/posts'));
app.use('/', require('./routes/users'));
app.use('/', require('./routes/explore'));
app.use('/', require('./routes/messages'));
app.use('/', require('./routes/notifications'));
app.use('/', require('./routes/bookmarks'));
app.use('/', require('./routes/settings'));

// ─── 404 & Error Handlers ───────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).render('error', {
    title: 'Page Not Found — Connect',
    code: 404,
    message: 'The page you\'re looking for doesn\'t exist.',
    currentUser: res.locals.currentUser
  });
});

app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).render('error', {
    title: 'Something Went Wrong — Connect',
    code: 500,
    message: 'An unexpected error occurred. Please try again.',
    currentUser: res.locals.currentUser
  });
});

// ─── Start Server ────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🌿 Connect is running at http://localhost:${PORT}\n`);
});

module.exports = app;
