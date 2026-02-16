import initSqlJs from 'sql.js';
import path from 'path';
import fs from 'fs';
import config from '../config/index.js';

let db = null;
let SQL = null;

const dbPath = path.resolve(process.cwd(), config.dbPath);
const dbDir = path.dirname(dbPath);

if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

async function initDb() {
  if (db) return db;
  
  SQL = await initSqlJs();
  
  let data = null;
  if (fs.existsSync(dbPath)) {
    data = fs.readFileSync(dbPath);
  }
  
  db = new SQL.Database(data);
  
  db.run(`
    CREATE TABLE IF NOT EXISTS news (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      content TEXT,
      summary TEXT,
      source TEXT NOT NULL,
      source_url TEXT NOT NULL UNIQUE,
      embed_url TEXT,
      media_type TEXT DEFAULT 'article',
      published_at DATETIME,
      collected_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      thumbnail TEXT
    )
  `);
  
  db.run(`CREATE INDEX IF NOT EXISTS idx_news_source ON news(source)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_news_collected_at ON news(collected_at)`);
  
  saveDb();
  
  return db;
}

function saveDb() {
  if (!db) return;
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(dbPath, buffer);
}

function getDb() {
  if (!db) {
    throw new Error('数据库未初始化，请先调用 initDb()');
  }
  return db;
}

function run(sql, params = []) {
  const db = getDb();
  db.run(sql, params);
  saveDb();
  return { changes: db.getRowsModified() };
}

function get(sql, params = []) {
  const db = getDb();
  const stmt = db.prepare(sql);
  stmt.bind(params);
  if (stmt.step()) {
    const row = stmt.getAsObject();
    stmt.free();
    return row;
  }
  stmt.free();
  return null;
}

function all(sql, params = []) {
  const db = getDb();
  const results = [];
  const stmt = db.prepare(sql);
  stmt.bind(params);
  while (stmt.step()) {
    results.push(stmt.getAsObject());
  }
  stmt.free();
  return results;
}

export default {
  initDb,
  run,
  get,
  all,
  saveDb
};
