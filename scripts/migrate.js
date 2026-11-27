#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');

const DB_PATH = process.env.YOLETECH_DB_PATH || path.join(__dirname, '..', 'server', 'yoletech.db');
const MIGRATIONS_DIR = path.join(__dirname, '..', 'server', 'migrations');

function runMigrations(dbPath = DB_PATH) {
  const db = new DatabaseSync(dbPath);
  db.exec('PRAGMA foreign_keys = ON;');
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id TEXT PRIMARY KEY,
      applied_at TEXT DEFAULT (datetime('now'))
    );
  `);

  const files = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  const applied = [];
  for (const file of files) {
    const exists = db.prepare('SELECT id FROM schema_migrations WHERE id = ?').get(file);
    if (exists) {
      continue;
    }
    const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');
    try {
      db.exec(sql);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (!/duplicate column name/i.test(msg)) {
        throw err;
      }
    }
    db.prepare('INSERT INTO schema_migrations (id) VALUES (?)').run(file);
    applied.push(file);
  }
  db.close();
  return { dbPath, files, applied };
}

if (require.main === module) {
  const result = runMigrations();
  console.log(`Migrations verified on ${result.dbPath}. Newly applied: ${result.applied.length ? result.applied.join(', ') : 'none (up to date)'}`);
}

module.exports = { runMigrations };
