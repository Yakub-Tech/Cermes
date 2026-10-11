import test from 'node:test';
import assert from 'node:assert/strict';
import { frischeApp } from './helfer.js';

function plan(db, sql, ...werte) {
  return db.prepare(`EXPLAIN QUERY PLAN ${sql}`).all(...werte).map((zeile) => zeile.detail).join(' | ');
}

test('Höchste heutige Nummer je Artikel nutzt den Tagesindex', () => {
  const { db } = frischeApp();
  const abfrageplan = plan(db,
    `SELECT MAX(nummer) AS n FROM kaertchen
     WHERE artikel_id = ? AND substr(erstellt_am, 1, 10) = ?`, 1, '2026-09-29');
  assert.match(abfrageplan, /idx_kaertchen_tag_artikel/);
});

test('Statistik eines Einzeltags nutzt den Tagesindex', () => {
  const { db } = frischeApp();
  const abfrageplan = plan(db,
    `SELECT artikel_name, COUNT(*) AS stueck FROM kaertchen
     WHERE substr(erstellt_am, 1, 10) = ? AND status != 'storniert'
     GROUP BY artikel_name`, '2026-09-29');
  assert.match(abfrageplan, /idx_kaertchen_tag_artikel/);
});
