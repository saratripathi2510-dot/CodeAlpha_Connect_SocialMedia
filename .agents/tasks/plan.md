# Implementation Plan — Connect Social Media Platform

> Greenfield project at `c:\SARA CLOUD\Desktop\Connect`.
> Stack: Node.js + Express + SQLite (better-sqlite3) + Vanilla HTML/CSS/JS.
> No build step — `npm install` then `node server.js`.
> Full spec: see original user request. FEAT artifacts: `.agents/tasks/features/`.

---

## FEAT-001 — Project Scaffold, Database, and Authentication

### Design decisions
- **better-sqlite3** chosen over `sqlite3` for its synchronous API, which eliminates callback complexity and suits a single-process Express app.
- **express-session** with in-memory store (default) is sufficient for a college-project / portfolio deployment; a production swap to `connect-sqlite3` can be done in one line.
- **bcryptjs** (pure JS) chosen over `bcrypt` (native addon) to avoid native compilation issues on Windows.
- All CSS theming via CSS custom properties on `:root` so dark mode is a single class toggle on `<html>`.

---

- [ ] 1. Create `package.json`.
      Set name `connect`, version `1.0.0`, main `server.js`, scripts `{ "start": "node server.js" }`.
      Dependencies: `express`, `better-sqlite3`, `bcryptjs`, `express-session`, `express-validator`, `multer`, `dotenv`, `helmet`, `uuid`, `cors`.
      Files: `package.json`
      Verify: `npm install` exits 0, `node_modules/` populated.

- [ ] 2. Create `.env.example` and `.gitignore`.
      `.env.example`: PORT, SESSION_SECRET, NODE_ENV, MAX_FILE_SIZE (5242880), ALLOWED_ORIGINS.
      `.gitignore`: node_modules/, .env, database/connect.db, uploads/*, !uploads/.gitkeep, *.log
      Files: `.env.example`, `.gitignore`
      Verify: files exist with correct content.

- [ ] 3. Create `database/schema.sql` with all `CREATE TABLE IF NOT EXISTS` statements.
      Tables: `users`, `posts`, `likes` (UNIQUE user_id+post_id), `bookmarks` (UNIQUE user_id+post_id), `comments`, `follows` (UNIQUE follower_id+following_id), `notifications`, `messages`, `conversations` (UNIQUE user1_id+user2_id).
      Include all foreign keys and relevant indexes.
      Files: `database/schema.sql`
      Verify: SQL file is syntactically valid (can be parsed by SQLite).

- [ ] 4. Create `database/db.js`.
      Open/create `database/connect.db` synchronously via `better-sqlite3`. Read and execute `schema.sql`. Export `db` instance and `initDB()` that also ensures `uploads/` directory exists via `fs.mkdirSync`.
      Files: `database/db.js`
      Verify: `node -e "require('./database/db.js')"` exits 0, creates `connect.db`.

- [ ] 5. Create `middleware/auth.js` and `middleware/upload.js`.
      `auth.js`: exports `requireAuth` (401 if no session) and `optionalAuth` (attaches user if session).
      `upload.js`: multer config with UUID filenames, image-only filter (jpeg/png/gif/webp), 5 MB limit; exports `avatarUpload`, `coverUpload`, `postImageUpload`.
      Files: `middleware/auth.js`, `middleware/upload.js`
      Verify: files exist; no syntax errors (`node -e "require('./middleware/auth.js')"`).

- [ ] 6. Create `routes/auth.js`.
      Endpoints: `POST /register` (validate + hash + insert + set session), `POST /login` (find + compare + set session), `POST /logout` (destroy session), `GET /me` (requireAuth, return user).
      Files: `routes/auth.js`
      Verify: file loads without error.

- [ ] 7. Create `server.js`.
      Wire helmet, cors, json/urlencoded parsers, express-session, static middleware for `public/` and `uploads/`. Mount `routes/auth.js` at `/api/auth`. Call `initDB()` on startup. Listen on `process.env.PORT || 3000`. Fallback: any unmatched GET serves `public/index.html`.
      Files: `server.js`
      Verify: `node server.js` starts, logs port, no crash.

- [ ] 8. Create CSS foundation — `public/css/style.css`, `public/css/auth.css`, `public/css/responsive.css`.
      `style.css`: CSS reset, all custom properties (light + dark), utility classes, three-column `.app-layout`, topbar, post card, modal, spinner.
      `auth.css`: centered auth card layout with Connect branding.
      `responsive.css`: breakpoints at 1024px (hide right sidebar) and 768px (hide left sidebar, show bottom nav, single column). `.bottom-nav` fixed at bottom.
      Files: `public/css/style.css`, `public/css/auth.css`, `public/css/responsive.css`
      Verify: CSS files load without parse errors in browser devtools.

- [ ] 9. Create `public/login.html` and `public/register.html`.
      Full HTML5 pages importing Google Fonts (Inter/DM Sans), style.css, auth.css, responsive.css.
      Login: email + password fields, link to register.
      Register: full_name, username, email, password, confirmPassword fields, link to login.
      Both load `public/js/auth.js`.
      Files: `public/login.html`, `public/register.html`
      Verify: pages render correctly in browser; no broken imports.

- [ ] 10. Create `public/js/auth.js`.
       Handles form submissions via Fetch API to `/api/auth/register` and `/api/auth/login`. On success, saves user to localStorage and redirects to `index.html`. Shows inline validation errors. Exports `checkAuth()` that redirects to `login.html` if no valid session.
       Files: `public/js/auth.js`
       Verify: register a test user in browser — redirects to index.html; login with wrong password — error shown inline.

---

## FEAT-002 — Posts Feed, Likes, Comments, Bookmarks

### Design decisions
- All post-listing queries join users and aggregate counts in SQL (not app-layer N+1 queries) for performance.
- `INSERT OR IGNORE` for likes/bookmarks prevents duplicates without needing a pre-check round-trip.
- Event delegation on the feed container handles dynamically rendered cards without re-binding.

---

- [ ] 11. Create `routes/posts.js`.
       `GET /` (public feed, 20 posts), `GET /feed` (requireAuth, followed users + own, paginated), `GET /:id`, `POST /` (requireAuth + postImageUpload), `PUT /:id` (owner only), `DELETE /:id` (owner only, cascades likes/comments/bookmarks/notifications, deletes image file).
       Files: `routes/posts.js`
       Verify: file loads cleanly; register in server.js.

- [ ] 12. Create `routes/likes.js`.
       `POST /posts/:postId` (requireAuth, INSERT OR IGNORE, create notification), `DELETE /posts/:postId` (requireAuth, delete like). Both return `{ liked, like_count }`.
       Files: `routes/likes.js`
       Verify: file loads; register in server.js.

- [ ] 13. Create `routes/comments.js`.
       `GET /posts/:postId`, `POST /posts/:postId` (requireAuth, 1-300 chars, create notification), `DELETE /:commentId` (comment owner or post owner).
       Files: `routes/comments.js`
       Verify: file loads; register in server.js.

- [ ] 14. Create `routes/bookmarks.js`.
       `POST /posts/:postId` (requireAuth, INSERT OR IGNORE), `DELETE /posts/:postId`, `GET /` (requireAuth, enriched post objects).
       Files: `routes/bookmarks.js`
       Verify: file loads; register in server.js.

- [ ] 15. Register all FEAT-002 routes in `server.js`.
       Add: `app.use('/api/posts', ...)`, `app.use('/api/likes', ...)`, `app.use('/api/comments', ...)`, `app.use('/api/bookmarks', ...)`.
       Files: `server.js`
       Verify: `node server.js` starts with all routes; `GET /api/posts` returns `[]`.

- [ ] 16. Create `public/index.html`.
       Three-column layout: left sidebar (logo, nav links with SVG icons, New Post button, user mini-profile), topbar (search, dark-mode toggle, notifications badge, user avatar), center column (stories row, post composer card `#post-form`, feed list `#feed-list`), right sidebar (suggestions `#suggestions-list`, trending topics).
       Script tags: `app.js` then `feed.js`.
       Files: `public/index.html`
       Verify: page loads in browser with correct layout structure.

- [ ] 17. Create `public/bookmarks.html`.
       Same three-column layout; center column: heading + `#bookmarks-list`.
       Script tags: `app.js` then `bookmarks.js`.
       Files: `public/bookmarks.html`
       Verify: page loads without errors.

- [ ] 18. Create `public/js/app.js`.
       Shared utilities: `apiFetch()`, `getCurrentUser()`, `setCurrentUser()`, `clearCurrentUser()`, `initDarkMode()`, `formatTimeAgo()`, `showToast()`, `renderAvatar()`, `confirmDelete()`. DOMContentLoaded: `checkAuth()` (calls `/api/auth/me`, redirects to login if 401), `initDarkMode()`, stores current user.
       Files: `public/js/app.js`
       Verify: no JS errors on page load for any page that loads this script.

- [ ] 19. Create `public/js/feed.js`.
       `loadFeed()` fetches `/api/posts/feed`, renders post cards via `renderPost()`. `renderPost()` returns full post card HTML: author info, content, image, action bar (like/comment/bookmark/share/more-options). Event delegation: like toggle, bookmark toggle, open comments modal (fetch + render comments, add comment form), delete post (confirmDelete + API + DOM removal), edit post modal. Post composer `#post-form`: FormData POST to `/api/posts`, prepend card. Suggestions: fetch `/api/users/suggestions`, render follow cards in `#suggestions-list`.
       Files: `public/js/feed.js`
       Verify: create post in browser — appears in feed; like — count changes; comment — comment appears in modal; bookmark — post appears on bookmarks page.

- [ ] 20. Create `public/js/bookmarks.js`.
       Fetches `GET /api/bookmarks`, renders post cards (reuses renderPost pattern), unbookmark action updates UI. Empty-state message when none.
       Files: `public/js/bookmarks.js`
       Verify: bookmarks.html shows bookmarked posts; removing unbookmarks correctly.

---

## FEAT-003 — User Profiles, Follow System, Search & Explore

### Design decisions
- Profile page uses a URL query param `?user=username` so it is a single HTML file handling both own and others' profiles — edit controls shown conditionally.
- Follow counts are computed live with `SELECT COUNT(*)` subqueries in the users route rather than denormalized columns, avoiding sync bugs.
- Search uses `LIKE '%q%'` with `LOWER()` for case-insensitive matching — sufficient for this scale without FTS5.

---

- [ ] 21. Create `routes/users.js`.
       `GET /suggestions` (requireAuth), `GET /:username` (optionalAuth, profile + counts + is_following), `GET /:username/posts`, `GET /:username/followers`, `GET /:username/following`, `PUT /me` (requireAuth, avatarUpload + coverUpload multer fields, update fields, delete old file if replaced).
       Files: `routes/users.js`
       Verify: file loads; register in server.js.

- [ ] 22. Create `routes/follows.js`.
       `POST /:userId` (requireAuth, no self-follow, INSERT OR IGNORE, create notification), `DELETE /:userId` (requireAuth). Both return `{ following, follower_count }`.
       Files: `routes/follows.js`
       Verify: file loads; register in server.js.

- [ ] 23. Create `routes/search.js`.
       `GET /` (query param `?q=&type=all|users|posts`), `GET /trending` (top 6 posts by likes in last 7 days).
       Files: `routes/search.js`
       Verify: file loads; register in server.js.

- [ ] 24. Register FEAT-003 routes in `server.js`.
       Add: `app.use('/api/users', ...)`, `app.use('/api/follows', ...)`, `app.use('/api/search', ...)`.
       Files: `server.js`
       Verify: `node server.js` starts; `GET /api/users/suggestions` returns array.

- [ ] 25. Create `public/profile.html`.
       Cover image, avatar, full_name, @username, bio, location, website, join date, stats row (posts/followers/following), tabs (Posts | Followers | Following), `#profile-content`. Edit Profile button (own profile). Follow/Following toggle button (others' profiles). Script tags: `app.js` then `profile.js`.
       Files: `public/profile.html`
       Verify: page loads in browser.

- [ ] 26. Create `public/explore.html`.
       Search bar `#explore-search`, category filter pills row, trending grid `#trending-grid`, search results `#search-results`. Script tags: `app.js` then `explore.js`.
       Files: `public/explore.html`
       Verify: page loads in browser.

- [ ] 27. Create `public/js/profile.js`.
       Read `?user=` param. Fetch and render profile header. Fetch and render posts. Wire follow/unfollow button (API + state update). Wire tab switching (Posts/Followers/Following). Edit profile modal (own profile only): fields + file inputs, PUT /api/users/me via FormData, refresh on success.
       Files: `public/js/profile.js`
       Verify: profile.html?user=testuser shows that user's info; Follow button works; edit modal saves changes.

- [ ] 28. Create `public/js/explore.js`.
       Load trending posts into `#trending-grid` on mount. Wire search form → `/api/search?q=`. Wire category pills. Wire user card clicks → profile page navigation.
       Files: `public/js/explore.js`
       Verify: explore.html shows trending; search returns results; category pills filter.

---

## FEAT-004 — Notifications, Messages, Settings, Responsive Polish & Dark Mode

### Design decisions
- Notifications are polled every 30s via `setInterval` (no WebSockets needed for a portfolio project; can be upgraded later).
- Messages use request-response fetch on conversation select, not long-polling — sufficient for demo purposes.
- Settings page is a standalone HTML page rather than a modal to keep it maintainable and give it its own URL.
- Dark mode is implemented entirely via CSS custom properties + a single `dark` class on `<html>`, so zero JS per-component is needed.

---

- [ ] 29. Create `routes/notifications.js`.
       `GET /` (last 50, JOIN actor), `GET /unread-count`, `PUT /mark-read` (all), `PUT /:id/read` (single). Register in server.js.
       Files: `routes/notifications.js`
       Verify: file loads; `GET /api/notifications/unread-count` returns `{ count: 0 }`.

- [ ] 30. Create `routes/messages.js`.
       `GET /conversations` (conversation list with last message + unread count), `GET /conversation/:userId` (thread), `POST /send` (validate + insert), `PUT /conversation/:userId/read`. Register in server.js.
       Files: `routes/messages.js`
       Verify: file loads; `GET /api/messages/conversations` returns `[]`.

- [ ] 31. Add `PUT /change-password` and `DELETE /delete-account` to `routes/auth.js`.
       change-password: requireAuth, validate, bcrypt compare, hash new, UPDATE.
       delete-account: requireAuth, delete all user data rows, destroy session.
       Files: `routes/auth.js`
       Verify: endpoints exist and respond correctly.

- [ ] 32. Create `public/notifications.html`.
       Three-column layout. Center: heading, filter tabs (All | Likes | Comments | Follows), `#notifications-list`. Script tags: `app.js` then `notifications.js`.
       Files: `public/notifications.html`
       Verify: page loads without errors.

- [ ] 33. Create `public/messages.html`.
       Three-column layout. Center split: `#conversations-list` panel + `#message-thread` panel with compose input. Script tags: `app.js` then `messages.js`.
       Files: `public/messages.html`
       Verify: page loads without errors.

- [ ] 34. Create `public/settings.html`.
       Three-column layout. Center: Account section (name/email/change-password form), Appearance (dark mode toggle), Danger Zone (delete account). Script tags: `app.js` then `settings.js`.
       Files: `public/settings.html`
       Verify: page loads without errors.

- [ ] 35. Create `public/404.html`.
       Minimal centered page: Connect logo, "404 — Page Not Found", link to home.
       Files: `public/404.html`
       Verify: navigating to a bad URL shows 404 page.

- [ ] 36. Create `public/js/notifications.js`.
       Fetch `/api/notifications`, render notification items (like/comment/follow text with actor avatar + link). Mark-all-read button. Filter tabs (client-side filter by type). Poll unread count every 30s, update `#notif-badge`. Call `initNav()` helper added to `app.js`.
       Files: `public/js/notifications.js`
       Verify: like a post as another user, visit notifications.html — notification appears.

- [ ] 37. Create `public/js/messages.js`.
       Load conversations into `#conversations-list`. On conversation click: load thread via `GET /api/messages/conversation/:userId`, render bubbles (own right-aligned, theirs left-aligned), mark read. Compose form: POST `/api/messages/send`, append sent bubble. Auto-scroll to bottom.
       Files: `public/js/messages.js`
       Verify: send message between two users — thread visible on messages.html.

- [ ] 38. Create `public/js/settings.js` (or inline in settings.html).
       Wire change-password form → `PUT /api/auth/change-password`. Wire delete account → `confirmDelete` modal → `DELETE /api/auth/delete-account` → redirect to login. Wire dark mode toggle to `localStorage` + `html.dark` class.
       Files: `public/js/settings.js` (or inline)
       Verify: change password works end-to-end; dark mode toggle persists across page refresh.

- [ ] 39. Update `public/js/app.js` with `initNav()`.
       Add `initNav()`: fetches `/api/notifications/unread-count`, sets badge text/visibility on `#notif-badge`. Called in DOMContentLoaded handler. Also ensure `getCurrentUser()` is called and its result is available to all page scripts.
       Files: `public/js/app.js`
       Verify: notification badge updates when there are unread notifications.

- [ ] 40. CSS responsive polish pass.
       Review all pages at 375px, 768px, 1024px, 1440px. Fix: any horizontal overflow, broken grid areas, unreadable text, misaligned avatars. Ensure dark mode variables cover every element on every page (cards, inputs, dropdowns, modals, bottom nav, sidebars). Add `:hover`/`:focus-visible` styles with terracotta. Add `transition: 0.2s ease` to interactive elements. Post image containers: `aspect-ratio: 4/3`, `object-fit: cover`. Avatar images: always `border-radius: 50%`.
       Files: `public/css/style.css`, `public/css/responsive.css`
       Verify: resize browser to 375px on every page — no layout breaks; toggle dark mode — all elements switch palette.

- [ ] 41. Create `uploads/.gitkeep`, finalize `README.md`.
       `README.md`: project name + tagline, tech stack table, setup steps (npm install, copy .env, node server.js, open localhost:3000), feature list, MIT license.
       Files: `uploads/.gitkeep`, `README.md`
       Verify: README renders correctly; uploads/.gitkeep present.

- [ ] 42. Full end-to-end integration check.
       Start server, register two users, follow each other, create posts with images, like/comment/bookmark, check notifications, send messages, edit profile, toggle dark mode on all pages — zero JS errors in browser console.
       Files: none (verification only)
       Verify: all steps in FEAT-004 acceptance criteria pass.

---

## Dependency Order Summary

```
FEAT-001 (scaffold + auth)
  └─ FEAT-002 (posts + likes + comments + bookmarks)   [needs: DB, auth middleware, upload middleware, CSS]
       └─ FEAT-003 (profiles + follows + search)        [needs: FEAT-001 + FEAT-002 posts endpoints]
            └─ FEAT-004 (notifications + messages + settings + polish)  [needs: all prior FEATs]
```

Each feature builds on the previous and leaves the codebase in a fully runnable state when complete.
