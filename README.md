# Connect

**Good People. Better Conversations.**

A full-featured social media web application built with Node.js, Express.js, SQLite, and EJS, featuring a clean **Sage Garden** design palette.

## Quick Start

```bash
npm install
npm start
```

Open `http://localhost:3000` in your browser.

## Features

| Feature | Status |
|---|---|
| Register, login, and logout | ✅ |
| Create and delete posts | ✅ |
| Image and video uploads | ✅ |
| Like and bookmark posts | ✅ |
| Comments | ✅ |
| Follow and unfollow users | ✅ |
| Home feed | ✅ |
| Stories | ✅ |
| Explore and search | ✅ |
| User profiles | ✅ |
| Direct messages | ✅ |
| Notifications | ✅ |
| Bookmarks page | ✅ |
| Profile and account settings | ✅ |
| Light, dark, and system themes | ✅ |
| Responsive mobile layout | ✅ |
| Custom error pages | ✅ |

## Tech Stack

- **Frontend:** HTML, CSS, JavaScript
- **Backend:** Node.js and Express.js
- **Database:** SQLite with `better-sqlite3`
- **Templates:** EJS
- **Authentication:** Sessions and `bcryptjs`
- **File uploads:** Multer

## Design System — Sage Garden

The interface uses a nature-inspired palette with sage green, forest green, soft peach, warm cream, and dark-mode colors.

## Project Structure

```text
Connect/
├── server.js
├── database/
│   ├── schema.sql
│   └── db.js
├── middleware/
│   └── auth.js
├── routes/
├── public/
│   ├── css/
│   ├── js/
│   └── images/
└── views/
    ├── partials/
    ├── auth/
    └── *.ejs
```

## About

Connect is a mini social media platform where users can create profiles, share posts, interact through likes and comments, and follow other users. It focuses on a clean, responsive interface and an engaging social experience.