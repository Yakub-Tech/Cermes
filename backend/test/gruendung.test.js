import test from 'node:test';
import assert from 'node:assert/strict';
import { frischeApp } from './helfer.js';

test('Datenbank wird mit Schema angelegt', () => {
  const { db } = frischeApp();
  const tabellen = db.prepare(
    "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
  ).all().map((zeile) => zeile.name);
  for (const erwartet of ['benutzer', 'artikel', 'beilage', 'artikel_beilage',
    'kassiervorgang', 'kaertchen', 'werbebild', 'einstellung']) {
    assert.ok(tabellen.includes(erwartet), `Tabelle ${erwartet} fehlt`);
  }
});
