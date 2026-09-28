import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import Database from 'better-sqlite3';
import { migrationenAusfuehren } from '../src/db.js';

function migrationsOrdner(dateien) {
  const ordner = fs.mkdtempSync(path.join(os.tmpdir(), 'cermes-migration-'));
  for (const [name, inhalt] of Object.entries(dateien)) {
    fs.writeFileSync(path.join(ordner, name), inhalt);
  }
  return ordner;
}

test('fehlgeschlagene Migration hinterlässt weder Teiländerung noch erhöhte Version', () => {
  const ordner = migrationsOrdner({
    '001-a.sql': 'CREATE TABLE t (id INTEGER PRIMARY KEY);',
    '002-b.sql': 'ALTER TABLE t ADD COLUMN x TEXT; ALTER TABLE t ADD COLUMN y TEXT; SELECT gibt_es_nicht FROM t;',
  });
  const db = new Database(':memory:');
  assert.throws(() => migrationenAusfuehren(db, ordner));
  const spalten = db.prepare('PRAGMA table_info(t)').all().map((s) => s.name);
  assert.deepEqual(spalten, ['id']);
  assert.equal(db.pragma('user_version', { simple: true }), 1);
});

test('Tabellenumbau mit Fremdschlüsseln funktioniert innerhalb der Transaktion', () => {
  const ordner = migrationsOrdner({
    '001-a.sql': `CREATE TABLE eltern (id INTEGER PRIMARY KEY);
      CREATE TABLE kind (id INTEGER PRIMARY KEY, eltern_id INTEGER REFERENCES eltern(id));`,
    '002-b.sql': `CREATE TABLE eltern_neu (id INTEGER PRIMARY KEY, name TEXT);
      INSERT INTO eltern_neu (id) SELECT id FROM eltern;
      DROP TABLE eltern;
      ALTER TABLE eltern_neu RENAME TO eltern;`,
  });
  const db = new Database(':memory:');
  db.pragma('foreign_keys = ON');
  migrationenAusfuehren(db, migrationsOrdner({ '001-a.sql': fs.readFileSync(path.join(ordner, '001-a.sql'), 'utf8') }));
  db.exec('INSERT INTO eltern VALUES (1); INSERT INTO kind VALUES (1, 1);');
  migrationenAusfuehren(db, ordner);
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM kind').get().n, 1);
  assert.equal(db.pragma('user_version', { simple: true }), 2);
  assert.equal(db.pragma('foreign_keys', { simple: true }), 1);
});
