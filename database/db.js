/**
 * database/db.js
 *
 * Uses the built-in node:sqlite module (available in Node 22+).
 * The API mirrors better-sqlite3: synchronous prepare/run/get/all/exec.
 */

const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const fs = require('fs');

const DB_PATH     = path.join(__dirname, 'connect.db');
const SCHEMA_PATH = path.join(__dirname, 'schema.sql');
const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');

// Open (or create) the database file synchronously.
// enableForeignKeyConstraints is on by default in node:sqlite.
const db = new DatabaseSync(DB_PATH);

// Read and apply the schema (CREATE TABLE IF NOT EXISTS — idempotent).
const schema = fs.readFileSync(SCHEMA_PATH, 'utf8');
db.exec(schema);

/**
 * initDB — ensures the uploads/ directory exists at server startup.
 */
function initDB() {
  if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
    console.log('Created uploads/ directory');
  }
}

module.exports = db;
module.exports.initDB = initDB;
