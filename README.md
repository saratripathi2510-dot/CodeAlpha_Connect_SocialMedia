# Connect

> **Good People. Better Conversations.**

Connect is a modern, full-stack social media platform built as a complete, production-quality web application. It supports user accounts, posts with images, likes, comments, bookmarks, follows, notifications, direct messages, and a full settings page — all with a polished responsive UI and dark mode.

---

## Tech Stack

| Layer       | Technology                                      |
|-------------|-------------------------------------------------|
| Frontend    | HTML5, CSS3 (custom properties), Vanilla JS     |
| Backend     | Node.js, Express.js (REST API)                  |
| Database    | SQLite via `node:sqlite` (built-in, Node 22+)   |
| Auth        | `express-session`, `bcryptjs`                   |
| Uploads     | `multer` (local disk, `uploads/` directory)     |
| Security    | `helmet`, `cors`, `express-validator`           |
| Environment | `dotenv`                                        |

---

## Features

- **Authentication** — register, login, logout, persistent sessions
- **User Profiles** — avatar, cover image, bio, location, website, follow/follower counts
- **Posts** — create text posts with optional image, edit, delete
- **Feed** — followed users' posts in reverse chronological order; public discovery feed
- **Likes** — like/unlike posts with real-time count updates
- **Comments** — add/delete comments with live rendering
- **Bookmarks** — save posts; dedicated bookmarks page
- **Follow system** — follow/unfollow users; followers/following lists
- **Notifications** — real-time badge polling (every 30 s); like/comment/follow notifications; filter by type; mark all read
- **Direct Messages** — conversation list; threaded message view; send/receive messages
- **Settings** — update account info, change password, dark mode toggle, delete account
- **Explore** — search users and posts; category filters; public post grid
- **Dark mode** — full dark theme via CSS custom properties; persisted in localStorage
- **Responsive** — three-column desktop layout collapses to single column + bottom nav on mobile
- **404 page** — branded not-found page

---

## Setup

### Prerequisites

- Node.js 22+ (uses built-in `node:sqlite`)
- npm

### Install & Run

```bash
# 1. Clone the repository
git clone <repo-url>
cd Connect

# 2. Install dependencies
npm install

# 3. Configure environment
cp .env.example .env
# Edit .env and set a strong SESSION_SECRET

# 4. Start the server
node server.js

# 5. Open in browser
# http://localhost:3000
```

The server auto-creates:
- `database/connect.db` — SQLite database with schema applied
- `uploads/` directory — for user-uploaded images

---

## Environment Variables

| Variable         | Default              | Description                          |
|------------------|----------------------|--------------------------------------|
| `SESSION_SECRET` | `connect-dev-secret` | Secret key for session signing       |
| `PORT`           | `3000`               | Port the server listens on           |
| `NODE_ENV`       | —                    | Set to `production` for secure cookies |
| `MAX_FILE_SIZE`  | `5242880` (5 MB)     | Maximum upload file size in bytes    |
| `ALLOWED_ORIGINS`| `*`                  | Comma-separated CORS origins         |

---

## Project Structure

```
Connect/
├── server.js              # Express app entry point
├── database/
│   ├── db.js              # SQLite init + schema runner
│   └── schema.sql         # Database schema
├── routes/                # API route handlers
│   ├── auth.js
│   ├── users.js
│   ├── posts.js
│   ├── likes.js
│   ├── comments.js
│   ├── bookmarks.js
│   ├── follows.js
│   ├── search.js
│   ├── notifications.js
│   └── messages.js
├── middleware/
│   ├── auth.js            # requireAuth / optionalAuth
│   └── upload.js          # multer configuration
├── public/                # Static frontend
│   ├── index.html         # Home / feed
│   ├── profile.html       # User profile
│   ├── explore.html       # Explore + search
│   ├── notifications.html # Notifications
│   ├── messages.html      # Direct messages
│   ├── bookmarks.html     # Saved posts
│   ├── settings.html      # Account settings
│   ├── login.html
│   ├── register.html
│   ├── 404.html
│   ├── css/
│   │   ├── style.css      # Master stylesheet + CSS variables + dark mode
│   │   ├── auth.css       # Login / register pages
│   │   └── responsive.css # Media queries + bottom nav
│   └── js/
│       ├── app.js         # Shared utilities + auth check + dark mode
│       ├── feed.js        # Home feed
│       ├── profile.js     # Profile page
│       ├── explore.js     # Explore / search
│       ├── notifications.js
│       ├── messages.js
│       ├── bookmarks.js
│       ├── settings.js
│       └── auth.js        # Login/register forms
└── uploads/               # Runtime image storage (git-ignored except .gitkeep)
```

---

## Screenshots

> _Add screenshots here after deployment._

---

## License

MIT
