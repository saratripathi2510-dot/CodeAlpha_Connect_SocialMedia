require('dotenv').config();

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const session = require('express-session');
const path = require('path');
const fs = require('fs');

const { initDB } = require('./database/db');
const authRoutes      = require('./routes/auth');
const postsRoutes     = require('./routes/posts');
const likesRoutes     = require('./routes/likes');
const commentsRoutes  = require('./routes/comments');
const bookmarksRoutes = require('./routes/bookmarks');

const app = express();
const PORT = process.env.PORT || 3000;
const isProd = process.env.NODE_ENV === 'production';

// ─── Initialise DB and uploads directory ─────────────────────────────────────
initDB();

// ─── Security & parsing middleware ───────────────────────────────────────────
app.use(
  helmet({
    contentSecurityPolicy: false // disabled so inline scripts work during dev
  })
);

app.use(
  cors({
    origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : '*',
    credentials: true
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ─── Session ─────────────────────────────────────────────────────────────────
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'connect-dev-secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: isProd,
      httpOnly: true,
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    }
  })
);

// ─── Static files ─────────────────────────────────────────────────────────────
// Serve uploaded images
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Serve the public/ frontend
app.use(express.static(path.join(__dirname, 'public')));

// ─── API routes ───────────────────────────────────────────────────────────────
app.use('/api/auth',      authRoutes);
app.use('/api/posts',     postsRoutes);
app.use('/api/likes',     likesRoutes);
app.use('/api/comments',  commentsRoutes);
app.use('/api/bookmarks', bookmarksRoutes);

// ─── SPA / HTML fallback ─────────────────────────────────────────────────────
app.get('*', (req, res) => {
  // Don't catch API calls
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ success: false, error: 'API endpoint not found' });
  }

  const indexPath = path.join(__dirname, 'public', 'index.html');
  const notFoundPath = path.join(__dirname, 'public', '404.html');

  if (fs.existsSync(indexPath)) {
    return res.sendFile(indexPath);
  } else if (fs.existsSync(notFoundPath)) {
    return res.status(404).sendFile(notFoundPath);
  } else {
    return res.status(404).send('Page not found');
  }
});

// ─── Start server ─────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`Connect server running on port ${PORT}`);
});

module.exports = app;
