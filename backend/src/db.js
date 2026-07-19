import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const migrationsOrdner = path.join(path.dirname(fileURLToPath(import.meta.url)), 'migrationen');

export function datenVerzeichnis() {
  return process.env.DATEN_VERZEICHNIS || path.resolve('data');
}

let db = null;

export function oeffneDatenbank() {
  if (db) return db;
  fs.mkdirSync(datenVerzeichnis(), { recursive: true });
  db = new Database(path.join(datenVerzeichnis(), 'cermes.sqlite'));
  db.pragma('journal_mode = WAL');
  db.pragma('busy_timeout = 5000');
  db.pragma('foreign_keys = ON');
  migrationenAusfuehren(db);
  return db;
}

function migrationenAusfuehren(db) {
  const stand = db.pragma('user_version', { simple: true });
  const dateien = fs.readdirSync(migrationsOrdner).filter((d) => d.endsWith('.sql')).sort();
  for (const datei of dateien) {
    const nummer = Number(datei.split('-')[0]);
    if (nummer > stand) {
      db.exec(fs.readFileSync(path.join(migrationsOrdner, datei), 'utf8'));
      db.pragma(`user_version = ${nummer}`);
    }
  }
}
