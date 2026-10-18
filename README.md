# Connect

> **Good People. Better Conversations.**

A full-featured social media web app built with Node.js, Express, SQLite, and EJS — styled with the **Sage Garden** design palette.

## Quick Start

```bash
npm install
npm start
```

Open **http://localhost:3000** in your browser.

## Features

| Feature | Status |
|---------|--------|
| Register / Login / Logout | ✅ |
| Create & delete posts | ✅ |
| Image/video uploads | ✅ |
| Like posts (AJAX) | ✅ |
| Bookmark posts (AJAX) | ✅ |
| Comments | ✅ |
| Follow / Unfollow users | ✅ |
| Home feed (followed users) | ✅ |
| Story circles | ✅ |
| Explore / Search | ✅ |
| User profiles | ✅ |
| Direct messages | ✅ |
| Notifications | ✅ |
| Bookmarks page | ✅ |
| Settings (profile, photos, password, theme) | ✅ |
| Light / Dark / System theme | ✅ |
| Responsive mobile layout | ✅ |
| 404 / 500 error pages | ✅ |

## Tech Stack

- **Backend**: Node.js + Express.js
- **Database**: SQLite via `better-sqlite3`
- **Templates**: EJS
- **Auth**: Sessions + bcryptjs
- **Uploads**: Multer
- **Fonts**: Playfair Display (serif headings) + Inter (sans-serif body)

## Design System — Sage Garden Palette

| Token | Light | Dark |
|-------|-------|------|
| Background | `#FAF5EE` | `#171D1B` |
| Card | `#FFFDF9` | `#222B27` |
| Sage Green | `#718B68` | `#A8C39A` |
| Forest Green | `#354A38` | `#C8D5B9` |
| Soft Peach | `#F5C8B8` | `#F0A99A` |
| Text Primary | `#282D28` | `#F7F3EB` |

## Project Structure

```
Connect/
├── server.js           # Express app
├── database/
│   ├── schema.sql      # SQLite schema
│   └── db.js           # DB connection
├── middleware/
│   └── auth.js         # Auth guards
├── routes/             # All route handlers
├── public/
│   ├── css/            # Design tokens, base, components, layout, fixes
│   ├── js/             # Theme switcher, feed interactions, messages
│   └── images/         # Static assets
└── views/
    ├── partials/       # head, sidebar, right-sidebar, post-card
    ├── auth/           # login, register
    └── *.ejs           # All page views
```
