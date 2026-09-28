import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import archiver from 'archiver';
import unzipper from 'unzipper';
import Database from 'better-sqlite3';
import { frischeApp, angemeldeterAgent } from './helfer.js';
import { datenVerzeichnis, oeffneDatenbank } from '../src/db.js';
import { testNeustartFunktionSetzen } from '../src/routen/backup.js';

testNeustartFunktionSetzen(() => {});

function bytesLesen(res, weiter) {
  const teile = [];
  res.on('data', (teil) => teile.push(teil));
  res.on('end', () => weiter(null, Buffer.concat(teile)));
}

function zipBauen(dateien) {
  return new Promise((erfolg, fehler) => {
    const zip = archiver('zip');
    const teile = [];
    zip.on('data', (teil) => teile.push(teil));
    zip.on('end', () => erfolg(Buffer.concat(teile)));
    zip.on('error', fehler);
    for (const [name, inhalt] of Object.entries(dateien)) zip.append(inhalt, { name });
    zip.finalize();
  });
}

function sqliteBytes(vorbereiten) {
  const datei = path.join(datenVerzeichnis(), 'test-pruefung.sqlite');
  fs.rmSync(datei, { force: true });
  const kurz = new Database(datei);
  vorbereiten(kurz);
  kurz.close();
  const bytes = fs.readFileSync(datei);
  fs.rmSync(datei, { force: true });
  return bytes;
}

async function artikelAnlegen(admin, name) {
  await admin.post('/api/artikel').send({
    name, farbe: '#f5c211', preis_cent: 100, beilagen_ids: [], sortierung: 1,
  });
}

async function ablehnungPruefen(admin, db, zipBytes, textTeil) {
  const antwort = await admin.post('/api/backup/einspielen').attach('backup', zipBytes, 'x.zip');
  assert.equal(antwort.status, 400);
  assert.match(antwort.body.fehler, textTeil);
  const namen = db.prepare('SELECT name FROM artikel').all().map((z) => z.name);
  assert.deepEqual(namen, ['Bleibt'], 'bisherige Daten unverändert');
  assert.equal(fs.existsSync(path.join(datenVerzeichnis(), 'einspielen-temp')), false, 'Temp-Ordner aufgeräumt');
}

test('Import: Text statt SQLite wird abgelehnt, alles bleibt unverändert', async () => {
  const { app, db } = frischeApp();
  const admin = await angemeldeterAgent(app, db, 'admin');
  await artikelAnlegen(admin, 'Bleibt');
  const zip = await zipBauen({ 'cermes.sqlite': 'das ist keine Datenbank' });
  await ablehnungPruefen(admin, db, zip, /Datenbank/);
});

test('Import: SQLite ohne Cermes-Tabellen wird abgelehnt', async () => {
  const { app, db } = frischeApp();
  const admin = await angemeldeterAgent(app, db, 'admin');
  await artikelAnlegen(admin, 'Bleibt');
  const fremd = sqliteBytes((kurz) => { kurz.exec('CREATE TABLE etwas (id INTEGER); PRAGMA user_version = 3;'); });
  await ablehnungPruefen(admin, db, await zipBauen({ 'cermes.sqlite': fremd }), /Cermes/);
});

test('Import: Backup einer neueren Cermes-Version wird abgelehnt', async () => {
  const { app, db } = frischeApp();
  const admin = await angemeldeterAgent(app, db, 'admin');
  await artikelAnlegen(admin, 'Bleibt');
  const backup = await admin.get('/api/backup').buffer().parse(bytesLesen);
  const zip = await unzipper.Open.buffer(backup.body);
  const datenbank = await zip.files.find((e) => e.path === 'cermes.sqlite').buffer();
  const datei = path.join(datenVerzeichnis(), 'neuer.sqlite');
  fs.writeFileSync(datei, datenbank);
  const kurz = new Database(datei);
  kurz.pragma('user_version = 999');
  kurz.close();
  const zuNeu = await zipBauen({ 'cermes.sqlite': fs.readFileSync(datei) });
  fs.rmSync(datei, { force: true });
  await ablehnungPruefen(admin, db, zuNeu, /neuere/);
});

test('Backup enthält Logo, Artikelbild und Werbebild und stellt sie in leerem Ziel wieder her', async () => {
  const { app, db } = frischeApp();
  const admin = await angemeldeterAgent(app, db, 'admin');
  await artikelAnlegen(admin, 'Mit Bildern');
  const dateien = {
    'logo/l.png': 'logo-inhalt',
    'artikelbilder/a.webp': 'artikelbild-inhalt',
    'werbung/w.jpg': 'werbung-inhalt',
  };
  for (const [name, inhalt] of Object.entries(dateien)) {
    const ziel = path.join(datenVerzeichnis(), name);
    fs.mkdirSync(path.dirname(ziel), { recursive: true });
    fs.writeFileSync(ziel, inhalt);
  }

  const backup = await admin.get('/api/backup').buffer().parse(bytesLesen);
  const zip = await unzipper.Open.buffer(backup.body);
  const namen = zip.files.map((e) => e.path).sort();
  assert.deepEqual(namen, ['artikelbilder/a.webp', 'cermes.sqlite', 'logo/l.png', 'werbung/w.jpg']);

  for (const ordner of ['logo', 'artikelbilder', 'werbung']) {
    fs.rmSync(path.join(datenVerzeichnis(), ordner), { recursive: true, force: true });
  }
  const antwort = await admin.post('/api/backup/einspielen').attach('backup', backup.body, 'b.zip');
  assert.equal(antwort.status, 200);
  for (const [name, inhalt] of Object.entries(dateien)) {
    assert.equal(fs.readFileSync(path.join(datenVerzeichnis(), name), 'utf8'), inhalt);
  }
  fs.rmSync(path.join(datenVerzeichnis(), 'cermes.sqlite.vor-einspielen'), { force: true });
});

test('Import: scheitert die Übernahme der Bilder, bleiben Datenbank und Bilder wie vorher', async (t) => {
  const { app, db } = frischeApp();
  const admin = await angemeldeterAgent(app, db, 'admin');
  await artikelAnlegen(admin, 'Bleibt');
  const logoDatei = path.join(datenVerzeichnis(), 'logo', 'l.png');
  fs.mkdirSync(path.dirname(logoDatei), { recursive: true });
  fs.writeFileSync(logoDatei, 'altes-logo');
  const backup = await admin.get('/api/backup').buffer().parse(bytesLesen);
  fs.writeFileSync(logoDatei, 'noch-neueres-logo');

  const echtesRename = fs.renameSync;
  t.mock.method(fs, 'renameSync', (von, nach) => {
    if (von.includes('einspielen-temp') && nach.endsWith(`${path.sep}logo`)) {
      throw new Error('Testfehler');
    }
    return echtesRename(von, nach);
  });
  const antwort = await admin.post('/api/backup/einspielen').attach('backup', backup.body, 'b.zip');
  t.mock.reset();

  assert.equal(antwort.status, 500);
  assert.equal(fs.readFileSync(logoDatei, 'utf8'), 'noch-neueres-logo');
  const namen = oeffneDatenbank().prepare('SELECT name FROM artikel').all().map((z) => z.name);
  assert.deepEqual(namen, ['Bleibt']);
  fs.rmSync(path.join(datenVerzeichnis(), 'cermes.sqlite.vor-einspielen'), { force: true });
});

test('Import: Datenbank mit behaupteter neuer Version, aber fehlenden Tabellen und Spalten wird abgelehnt', async () => {
  const { app, db } = frischeApp();
  const admin = await angemeldeterAgent(app, db, 'admin');
  await artikelAnlegen(admin, 'Bleibt');
  const unvollstaendig = sqliteBytes((kurz) => {
    kurz.exec(`CREATE TABLE benutzer (id INTEGER); CREATE TABLE artikel (id INTEGER);
      CREATE TABLE kaertchen (id INTEGER); PRAGMA user_version = 12;`);
  });
  await ablehnungPruefen(admin, db, await zipBauen({ 'cermes.sqlite': unvollstaendig }), /Cermes/);
});

test('Export: scheitert schon das Anlegen des Temp-Ordners, kommt ein deutscher Fehler statt Serverabsturz', async (t) => {
  const { app, db } = frischeApp();
  const admin = await angemeldeterAgent(app, db, 'admin');
  t.mock.method(fs, 'mkdtempSync', () => { throw new Error('Testfehler: Datenträger voll'); });
  const antwort = await admin.get('/api/backup');
  t.mock.reset();
  assert.equal(antwort.status, 500);
  assert.match(antwort.body.fehler, /Backup/);
});
