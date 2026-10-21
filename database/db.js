const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// Allow database path configuration via environment variable (e.g. for Render Persistent Disks)
const DB_PATH = process.env.DATABASE_PATH || process.env.DB_PATH || path.join(__dirname, 'connect.db');
const resolvedDbPath = path.resolve(DB_PATH);
const SCHEMA_PATH = path.join(__dirname, 'schema.sql');

// Ensure database directory exists
const dbDir = path.dirname(resolvedDbPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new Database(resolvedDbPath);

// Enable WAL mode for better concurrent read performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Initialize schema if needed
if (fs.existsSync(SCHEMA_PATH)) {
  const schema = fs.readFileSync(SCHEMA_PATH, 'utf8');
  db.exec(schema);
}

module.exports = db;
