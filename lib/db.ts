import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";

const globalForDb = globalThis as unknown as { sqlite?: Database.Database };

function init(): Database.Database {
  const sqlite = new Database(process.env.DATABASE_FILE || "data.db");
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  // 첫 실행 시 테이블 자동 생성 — 별도 마이그레이션 명령 불필요 (MVP)
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY, google_id TEXT UNIQUE, email TEXT NOT NULL UNIQUE,
      important_criteria TEXT, onboarded INTEGER NOT NULL DEFAULT 0,
      is_demo INTEGER NOT NULL DEFAULT 0, created_at INTEGER
    );
    CREATE TABLE IF NOT EXISTS oauth_tokens (
      user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      refresh_token TEXT NOT NULL, scope TEXT, updated_at INTEGER
    );
    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL, description TEXT NOT NULL, created_at INTEGER
    );
    CREATE TABLE IF NOT EXISTS emails (
      id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      gmail_message_id TEXT NOT NULL, sender TEXT NOT NULL,
      sender_domain TEXT NOT NULL DEFAULT '', subject TEXT NOT NULL,
      received_at INTEGER NOT NULL, snippet TEXT NOT NULL DEFAULT ''
    );
    CREATE UNIQUE INDEX IF NOT EXISTS emails_user_msg_uq ON emails(user_id, gmail_message_id);
    CREATE INDEX IF NOT EXISTS emails_user_date_idx ON emails(user_id, received_at);
    CREATE TABLE IF NOT EXISTS classifications (
      id TEXT PRIMARY KEY, email_id TEXT NOT NULL REFERENCES emails(id) ON DELETE CASCADE,
      category_id TEXT REFERENCES categories(id) ON DELETE SET NULL,
      is_important INTEGER NOT NULL DEFAULT 0, summary TEXT NOT NULL DEFAULT '',
      confidence REAL NOT NULL DEFAULT 0, reason TEXT NOT NULL DEFAULT '',
      source TEXT NOT NULL, created_at INTEGER
    );
    CREATE INDEX IF NOT EXISTS cls_email_idx ON classifications(email_id, created_at);
    CREATE TABLE IF NOT EXISTS feedbacks (
      id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      email_id TEXT NOT NULL REFERENCES emails(id) ON DELETE CASCADE,
      before_category_id TEXT, after_category_id TEXT, created_at INTEGER
    );
    CREATE TABLE IF NOT EXISTS sender_rules (
      id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      sender TEXT NOT NULL,
      category_id TEXT NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
      created_at INTEGER
    );
    CREATE UNIQUE INDEX IF NOT EXISTS rules_user_sender_uq ON sender_rules(user_id, sender);
    CREATE TABLE IF NOT EXISTS sync_states (
      user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      last_synced_at INTEGER, total_target INTEGER NOT NULL DEFAULT 0
    );
  `);
  return sqlite;
}

const sqlite = globalForDb.sqlite ?? init();
if (process.env.NODE_ENV !== "production") globalForDb.sqlite = sqlite;

export const db = drizzle(sqlite, { schema });
export { schema };
