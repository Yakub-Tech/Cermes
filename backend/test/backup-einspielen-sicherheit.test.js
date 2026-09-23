import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import request from 'supertest';
import { frischeApp, angemeldeterAgent } from './helfer.js';
import { oeffneDatenbank, schliesseDatenbank, datenVerzeichnis } from '../src/db.js';
import { backupWirdEingespielt, testSperreSetzen } from '../src/routen/backup.js';

test('Backup einspielen: WAL wird geleert und die Verbindung geschlossen, keine alten Seiten überschreiben die neue Datei', async () => {
  const { app, db } = frischeApp();
  const admin = await angemeldeterAgent(app, db, 'admin');

  await admin.post('/api/artikel').send({
    name: 'Alt', farbe: '#f5c211', preis_cent: 100, beilagen_ids: [], sortierung: 1,
  });
  const backupAlt = await admin.get('/api/backup').buffer().parse((res, weiter) => {
    const teile = [];
    res.on('data', (teil) => teile.push(teil));
    res.on('end', () => weiter(null, Buffer.concat(teile)));
  });

  await admin.post('/api/artikel').send({
    name: 'Neu', farbe: '#7a1a2f', preis_cent: 200, beilagen_ids: [], sortierung: 2,
  });

  const einspielen = await admin.post('/api/backup/einspielen').attach('backup', backupAlt.body, 'alt.zip');
  assert.equal(einspielen.status, 200);

  schliesseDatenbank();
  const neueVerbindung = oeffneDatenbank();

  const artikelNamen = neueVerbindung.prepare('SELECT name FROM artikel ORDER BY name').all()
    .map((zeile) => zeile.name);
  assert.deepEqual(artikelNamen, ['Alt'], 'nur der Stand des eingespielten Backups ist da, nicht mehr die neuere Schreibaktivität danach');
});

test('Backup einspielen: scheitert das Schreiben, bleibt der bisherige Stand erhalten und es kommt ein deutscher Fehlertext', async (t) => {
  const { app, db } = frischeApp();
  const admin = await angemeldeterAgent(app, db, 'admin');

  await admin.post('/api/artikel').send({
    name: 'Vorher', farbe: '#f5c211', preis_cent: 100, beilagen_ids: [], sortierung: 1,
  });
  const backup = await admin.get('/api/backup').buffer().parse((res, weiter) => {
    const teile = [];
    res.on('data', (teil) => teile.push(teil));
    res.on('end', () => weiter(null, Buffer.concat(teile)));
  });

  t.mock.method(fs, 'writeFileSync', () => {
    throw new Error('Testfehler: Datenträger voll');
  });

  const einspielen = await admin.post('/api/backup/einspielen').attach('backup', backup.body, 'kaputt.zip');
  assert.equal(einspielen.status, 500);
  assert.match(einspielen.body.fehler, /wiederhergestellt/);
  assert.doesNotMatch(einspielen.body.fehler, /Error|undefined|null/);

  t.mock.reset();

  const neueVerbindung = oeffneDatenbank();
  const artikelNamen = neueVerbindung.prepare('SELECT name FROM artikel ORDER BY name').all()
    .map((zeile) => zeile.name);
  assert.deepEqual(artikelNamen, ['Vorher'], 'der Stand von vor dem gescheiterten Einspielen ist wiederhergestellt');

  fs.rmSync(path.join(datenVerzeichnis(), 'cermes.sqlite.vor-einspielen'), { force: true });
});

test('Backup einspielen: Login funktioniert danach weiterhin, ohne Neustart', async () => {
  const { app, db } = frischeApp();
  const admin = await angemeldeterAgent(app, db, 'admin');
  const backup = await admin.get('/api/backup').buffer().parse((res, weiter) => {
    const teile = [];
    res.on('data', (teil) => teile.push(teil));
    res.on('end', () => weiter(null, Buffer.concat(teile)));
  });

  const einspielen = await admin.post('/api/backup/einspielen').attach('backup', backup.body, 'stand.zip');
  assert.equal(einspielen.status, 200);

  const login = await request(app).post('/api/login').send({ benutzername: 'test-admin', passwort: 'geheim' });
  assert.equal(login.status, 200, 'Login funktioniert ohne Prozess-Neustart weiter');
  assert.equal(login.body.rolle, 'admin');

  fs.rmSync(path.join(datenVerzeichnis(), 'cermes.sqlite.vor-einspielen'), { force: true });
});

test('Backup einspielen: die Sperre ist während des gesamten Datei-Schreibens aktiv', async (t) => {
  const { app, db } = frischeApp();
  const admin = await angemeldeterAgent(app, db, 'admin');

  await admin.post('/api/artikel').send({
    name: 'Alt', farbe: '#f5c211', preis_cent: 100, beilagen_ids: [], sortierung: 1,
  });
  const backup = await admin.get('/api/backup').buffer().parse((res, weiter) => {
    const teile = [];
    res.on('data', (teil) => teile.push(teil));
    res.on('end', () => weiter(null, Buffer.concat(teile)));
  });

  assert.equal(backupWirdEingespielt(), false, 'außerhalb eines Einspielens ist die Sperre aus');

  let waehrendDesSchreibens;
  const echtesWriteFileSync = fs.writeFileSync;
  t.mock.method(fs, 'writeFileSync', function (...args) {
    waehrendDesSchreibens = backupWirdEingespielt();
    return echtesWriteFileSync.apply(fs, args);
  });

  const einspielen = await admin.post('/api/backup/einspielen').attach('backup', backup.body, 'alt.zip');
  t.mock.reset();

  assert.equal(einspielen.status, 200);
  assert.equal(waehrendDesSchreibens, true, 'die Sperre war aktiv, während die Datenbankdatei überschrieben wurde');
  assert.equal(backupWirdEingespielt(), false, 'die Sperre ist nach dem Einspielen wieder aus');

  fs.rmSync(path.join(datenVerzeichnis(), 'cermes.sqlite.vor-einspielen'), { force: true });
});

test('Backup einspielen: die Sperre-Middleware weist andere Anfragen ab, solange sie aktiv ist', async () => {
  const { app } = frischeApp();
  testSperreSetzen(true);
  try {
    const antwort = await request(app).get('/api/gesundheit');
    assert.equal(antwort.status, 503);
    assert.match(antwort.body.fehler, /Backup/);
  } finally {
    testSperreSetzen(false);
  }
});
