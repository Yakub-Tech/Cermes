import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { frischeApp } from './helfer.js';
import { datenVerzeichnis, oeffneDatenbank } from '../src/db.js';
import { beendenBeiSigtermRegistrieren } from '../src/server.js';

test('SIGTERM schließt die Datenbank sauber: WAL-Dateien verschwinden, Daten bleiben, Prozess endet mit 0', () => {
  const { db } = frischeApp();
  db.prepare('INSERT INTO benutzer (benutzername, passwort_hash, rolle, erstellt_am) VALUES (?, ?, ?, ?)')
    .run('sigterm-test', 'hash', 'kasse', '2026-01-01T00:00:00');
  const walDatei = path.join(datenVerzeichnis(), 'cermes.sqlite-wal');
  const shmDatei = path.join(datenVerzeichnis(), 'cermes.sqlite-shm');
  assert.ok(fs.statSync(walDatei).size > 0, 'vorher steckt der Benutzer noch in der WAL-Datei');

  const handler = {};
  const beendetMit = [];
  const ersatzProzess = {
    on(signal, funktion) { handler[signal] = funktion; },
    exit(code) { beendetMit.push(code); },
  };
  beendenBeiSigtermRegistrieren(ersatzProzess);
  assert.equal(typeof handler.SIGTERM, 'function', 'für SIGTERM ist ein Handler registriert');

  handler.SIGTERM();

  assert.deepEqual(beendetMit, [0], 'der Prozess wird genau einmal mit Code 0 beendet');
  assert.equal(fs.existsSync(walDatei), false, 'die WAL-Datei ist weg');
  assert.equal(fs.existsSync(shmDatei), false, 'die SHM-Datei ist weg');
  const neu = oeffneDatenbank();
  const zeile = neu.prepare('SELECT rolle FROM benutzer WHERE benutzername = ?').get('sigterm-test');
  assert.equal(zeile.rolle, 'kasse', 'die Daten sind nach dem Schließen noch da');
});

test('Import von server.js und erstelleApp() melden keinen SIGTERM-Handler an', () => {
  frischeApp();
  assert.equal(process.listenerCount('SIGTERM'), 0);
});
