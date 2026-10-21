require('dotenv').config();

const express = require('express');
const session = require('express-session');
const SqliteStore = require('better-sqlite3-session-store')(session);
const path = require('path');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cors = require('cors');
const db = require('./database/db');
const { validateCloudinaryConfig } = require('./services/cloudinary');

const app = express();

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';
const isProduction = process.env.NODE_ENV === 'production';

// Fail fast on server startup if Cloudinary credentials are missing in production
validateCloudinaryConfig();

// Render runs behind a reverse proxy (HTTPS SSL termination)
// trust proxy is REQUIRED for secure cookies and rate-limiting by real client IP
if (isProduction) {
  app.set('trust proxy', 1);
}

// ─── Security: Helmet ───────────────────────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "blob:", "https://res.cloudinary.com", "https://*.cloudinary.com"],
      mediaSrc: ["'self'", "data:", "blob:", "https://res.cloudinary.com", "https://*.cloudinary.com"],
      connectSrc: ["'self'", ...(process.env.CLIENT_URL ? process.env.CLIENT_URL.split(',').map(s => s.trim()) : [])]
    }
  },
  crossOriginEmbedderPolicy: false
}));

// ─── Security: CORS ─────────────────────────────────────────────────────────
const allowedOrigins = process.env.CLIENT_URL
  ? process.env.CLIENT_URL.split(',').map(s => s.trim())
  : ['http://localhost:3000', 'http://127.0.0.1:3000'];

app.use(cors({
  origin: function (origin, callback) {
    // Allow server-rendered requests, curl, mobile apps without Origin header
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) !== -1 || allowedOrigins.includes('*')) {
      return callback(null, true);
    }
    return callback(new Error('Blocked by CORS policy'));
  },
  credentials: true
}));

// ─── Security: Rate Limiting ────────────────────────────────────────────────
// General rate limiter for general browsing: 300 requests per 15 minutes per IP
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  message: 'Too many requests from this IP. Please try again after 15 minutes.',
  standardHeaders: true,
  legacyHeaders: false
});
app.use(generalLimiter);

// Stricter rate limiter for authentication routes to prevent brute-force attacks
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: 'Too many login or registration attempts. Please try again after 15 minutes.',
  standardHeaders: true,
  legacyHeaders: false
});
app.use('/login', authLimiter);
app.use('/register', authLimiter);

// ─── Parsers & Static Files ─────────────────────────────────────────────────
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// ─── Session Setup ──────────────────────────────────────────────────────────
const sessionSecret = process.env.SESSION_SECRET || (isProduction
  ? 'connect-prod-secret-' + (process.env.RENDER_SERVICE_ID || 'fallback-salt-2024')
  : 'connect-sage-garden-secret-2024');

if (isProduction && !process.env.SESSION_SECRET) {
  console.warn('⚠️  WARNING: SESSION_SECRET is not set in environment variables! Please configure it in your Render Dashboard.');
}

app.use(session({
  store: new SqliteStore({
    client: db,
    expired: {
      clear: true,
      intervalMs: 15 * 60 * 1000 // Automatically clean up expired sessions every 15 minutes
    }
  }),
  secret: sessionSecret,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: isProduction, // HTTPS required in production
    httpOnly: true, // Prevents client-side script cookie theft
    sameSite: 'lax', // CSRF protection
    maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
  }
}));

// ─── User Injection ─────────────────────────────────────────────────────────

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
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Make view helpers and config available to all templates
app.use((req, res, next) => {
  res.locals.session = req.session;
  res.locals.path = req.path;
  res.locals.apiBaseUrl = process.env.API_BASE_URL || '';
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
    return `/images/avatar-placeholder.svg`;
  };
  next();
});

// ─── Health Check Endpoint for Render ────────────────────────────────────────
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    environment: process.env.NODE_ENV || 'development',
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString()
  });
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
// Listen on HOST (0.0.0.0) and PORT specified by Render
app.listen(PORT, HOST, () => {
  console.log(`\n🌿 Connect is running at http://${HOST}:${PORT} [NODE_ENV: ${process.env.NODE_ENV || 'development'}]\n`);
});

module.exports = app;
