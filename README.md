# Connect

**Good People. Better Conversations.**

Connect is a modern, full-stack social media platform built with HTML, CSS, JavaScript, Node.js, Express.js, and SQLite. It supports user accounts, posts, likes, comments, bookmarks, following, notifications, direct messaging, and responsive user profiles.

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | HTML5, CSS3, Vanilla JavaScript |
| Backend | Node.js, Express.js, REST API |
| Database | SQLite |
| Authentication | Express Session, bcryptjs |
| File Uploads | Multer |
| Security | Helmet, CORS, Express Validator |
| Environment | dotenv |

## Features

- **Authentication:** Registration, login, and logout.
- **User Profiles:** Profile information, avatars, cover images, and follower counts.
- **Posts:** Create, edit, and delete posts, with optional images.
- **Feed:** Browse posts and discover content.
- **Likes and Comments:** Interact with posts.
- **Bookmarks:** Save posts for later.
- **Follow System:** Follow and unfollow users.
- **Notifications:** Receive activity notifications.
- **Direct Messages:** Send and receive messages.
- **Explore and Search:** Discover users and posts.
- **Settings:** Manage account preferences and supported settings.
- **Dark Mode:** Switch between light and dark themes.
- **Responsive Design:** Layouts optimized for desktop and mobile.
- **Custom 404 Page:** Branded page for unavailable routes.

## Getting Started

### Prerequisites

- Node.js 22 or later if using the built-in `node:sqlite` module.
- npm.

### Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/saratripathi2510-dot/CodeAlpha_Connect_SocialMedia.git
   cd CodeAlpha_Connect_SocialMedia
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Configure environment variables if your project requires them.

4. Start the application:

   ```bash
   npm start
   ```

5. Open your browser at:

   http://localhost:3000

### Database

The application uses SQLite. Database initialization and table creation are handled by the project's database module. Check the actual database configuration before deploying.

## Project Structure

```text
Connect/
├── server.js
├── package.json
├── database/
├── middleware/
├── routes/
└── public/
    ├── css/
    ├── js/
    ├── index.html
    ├── profile.html
    ├── explore.html
    ├── notifications.html
    ├── messages.html
    ├── bookmarks.html
    ├── settings.html
    ├── login.html
    ├── register.html
    └── 404.html
```

## Screenshots

Add screenshots of the application here.

## License

MIT