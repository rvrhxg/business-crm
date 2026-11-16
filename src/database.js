import { DatabaseSync } from 'node:sqlite';
export function openDatabase(path=process.env.DATABASE_PATH || 'crm.sqlite') {
  const db=new DatabaseSync(path);
  db.exec(`PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL;
    CREATE TABLE IF NOT EXISTS users(id INTEGER PRIMARY KEY,email TEXT NOT NULL UNIQUE COLLATE NOCASE,name TEXT NOT NULL,password_hash TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS sessions(token_hash TEXT PRIMARY KEY,user_id INTEGER NOT NULL REFERENCES users(id),expires_at INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS customers(id INTEGER PRIMARY KEY,owner_id INTEGER NOT NULL REFERENCES users(id),name TEXT NOT NULL,company TEXT NOT NULL DEFAULT '',email TEXT NOT NULL DEFAULT '',phone TEXT NOT NULL DEFAULT '',created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
    CREATE INDEX IF NOT EXISTS customer_owner ON customers(owner_id);
    CREATE TABLE IF NOT EXISTS deals(id INTEGER PRIMARY KEY,owner_id INTEGER NOT NULL REFERENCES users(id),customer_id INTEGER NOT NULL REFERENCES customers(id),title TEXT NOT NULL,amount_cents INTEGER NOT NULL CHECK(amount_cents>=0),stage TEXT NOT NULL DEFAULT 'lead' CHECK(stage IN ('lead','qualified','proposal','won','lost')),created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
    CREATE INDEX IF NOT EXISTS deal_owner ON deals(owner_id);
    CREATE TABLE IF NOT EXISTS activities(id INTEGER PRIMARY KEY,owner_id INTEGER NOT NULL REFERENCES users(id),deal_id INTEGER NOT NULL REFERENCES deals(id),body TEXT NOT NULL,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
    CREATE TABLE IF NOT EXISTS tasks(id INTEGER PRIMARY KEY,owner_id INTEGER NOT NULL REFERENCES users(id),deal_id INTEGER NOT NULL REFERENCES deals(id),title TEXT NOT NULL,due_date TEXT NOT NULL,done INTEGER NOT NULL DEFAULT 0 CHECK(done IN(0,1)));
  `);
  return db;
}
