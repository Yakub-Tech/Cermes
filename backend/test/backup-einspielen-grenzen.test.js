import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import archiver from 'archiver';
import unzipper from 'unzipper';
import { frischeApp, angemeldeterAgent } from './helfer.js';
import { datenVerzeichnis, oeffneDatenbank } from '../src/db.js';
import { entpacken } from '../src/backupEinspielen.js';
import { testNeustartFunktionSetzen } from '../src/routen/backup.js';

testNeustartFunktionSetzen(() => {});

function zipBauen(dateien, unkomprimiert = false) {
  return new Promise((erfuellt, abgelehnt) => {
    const zip = archiver('zip');
    const teile = [];
    zip.on('data', (teil) => teile.push(teil));
    zip.on('end', () => erfuellt(Buffer.concat(teile)));
    zip.on('error', abgelehnt);
    for (const [name, inhalt] of Object.entries(dateien)) zip.append(inhalt, { name, store: unkomprimiert });
    zip.finalize();
  });
}

test('Entpacken: mehr entpackte Daten als erlaubt wird abgelehnt, gezählt werden die echten Bytes', async (t) => {
  const tempOrdner = fs.mkdtempSync(path.join(os.tmpdir(), 'cermes-grenze-'));
  t.after(() => fs.rmSync(tempOrdner, { recursive: true, force: true }));
  const zip = await unzipper.Open.buffer(await zipBauen({
    'cermes.sqlite': Buffer.alloc(10), 'werbung/bombe.png': Buffer.alloc(5000),
  }));

  await assert.rejects(entpacken(zip, tempOrdner, { maxBytes: 1000, maxDateien: 10 }), (fehler) => {
    assert.equal(fehler.status, 400);
    assert.match(fehler.message, /entpackt zu groß/);
    return true;
  });
  await entpacken(zip, tempOrdner, { maxBytes: 6000, maxDateien: 10 });
  assert.equal(fs.statSync(path.join(tempOrdner, 'werbung', 'bombe.png')).size, 5000);
});

test('Backup einspielen: ein ZIP mit mehr als 10.000 Dateien wird verständlich abgelehnt, nichts wird verändert', async () => {
  const { app, db } = frischeApp();
  const admin = await angemeldeterAgent(app, db, 'admin');
  await admin.post('/api/artikel').send({
    name: 'Bleibt', farbe: '#f5c211', preis_cent: 100, beilagen_ids: [], sortierung: 1,
  });

  const dateien = { 'cermes.sqlite': Buffer.alloc(10) };
  for (let i = 0; i < 10000; i += 1) dateien[`werbung/${i}.png`] = Buffer.alloc(1);
  const antwort = await admin.post('/api/backup/einspielen').attach('backup', await zipBauen(dateien), 'viele.zip');

  assert.equal(antwort.status, 400);
  assert.equal(antwort.body.fehler,
    'Dieses Backup enthält zu viele Dateien (mehr als 10.000). Das ist kein normales Cermes-Backup, der bisherige Stand ist unverändert.');
  assert.deepEqual(db.prepare('SELECT name FROM artikel').all().map((zeile) => zeile.name), ['Bleibt']);
});

test('Entpacken: schreibt writeSync nur einen Teil, wird weitergeschrieben, die Datei ist vollständig', async (t) => {
  const tempOrdner = fs.mkdtempSync(path.join(os.tmpdir(), 'cermes-teilschreiben-'));
  t.after(() => fs.rmSync(tempOrdner, { recursive: true, force: true }));
  const zip = await unzipper.Open.buffer(await zipBauen({ 'werbung/bild.png': Buffer.alloc(5000, 7) }));

  const echtesWriteSync = fs.writeSync;
  t.mock.method(fs, 'writeSync', (datei, puffer, versatz = 0, laenge = puffer.length - versatz) => (
    echtesWriteSync(datei, puffer, versatz, Math.min(laenge, 100))
  ));

  await entpacken(zip, tempOrdner, { maxBytes: 10000, maxDateien: 10 });
  assert.equal(fs.statSync(path.join(tempOrdner, 'werbung', 'bild.png')).size, 5000);
});

function einByteAendern(zipBytes, inhalt) {
  const kaputt = Buffer.from(zipBytes);
  kaputt[kaputt.indexOf(inhalt) + 100] ^= 0xff;
  return kaputt;
}

test('Entpacken: ein geändertes Byte im Bild fällt an der Prüfsumme auf, ein unverändertes ZIP wird vollständig entpackt', async (t) => {
  const tempOrdner = fs.mkdtempSync(path.join(os.tmpdir(), 'cermes-pruefsumme-'));
  t.after(() => fs.rmSync(tempOrdner, { recursive: true, force: true }));
  const bild = crypto.randomBytes(20000);
  const zipBytes = await zipBauen({
    'cermes.sqlite': Buffer.alloc(10), 'logo/x.png': bild, 'werbung/leer.png': Buffer.alloc(0),
  }, true);

  const kaputtesZip = await unzipper.Open.buffer(einByteAendern(zipBytes, bild));
  await assert.rejects(entpacken(kaputtesZip, tempOrdner), (fehler) => {
    assert.equal(fehler.status, undefined);
    assert.match(fehler.message, /Prüfsumme/);
    return true;
  });

  const heilesZip = await unzipper.Open.buffer(zipBytes);
  await entpacken(heilesZip, tempOrdner);
  assert.deepEqual(fs.readFileSync(path.join(tempOrdner, 'logo', 'x.png')), bild);
  assert.equal(fs.statSync(path.join(tempOrdner, 'werbung', 'leer.png')).size, 0);
});

test('Backup einspielen: ein Bild mit geändertem Byte wird abgelehnt und nichts verändert, dasselbe ZIP unverändert wird eingespielt', async () => {
  const { app, db } = frischeApp();
  const admin = await angemeldeterAgent(app, db, 'admin');
  const artikelAnlegen = (name, sortierung) => admin.post('/api/artikel').send({
    name, farbe: '#f5c211', preis_cent: 100, beilagen_ids: [], sortierung,
  });
  await artikelAnlegen('Im Backup', 1);
  const backup = await admin.get('/api/backup').buffer().parse((antwort, weiter) => {
    const teile = [];
    antwort.on('data', (teil) => teile.push(teil));
    antwort.on('end', () => weiter(null, Buffer.concat(teile)));
  });
  const datenbank = await (await unzipper.Open.buffer(backup.body)).files
    .find((eintrag) => eintrag.path === 'cermes.sqlite').buffer();
  await artikelAnlegen('Nur im laufenden Stand', 2);

  const bild = crypto.randomBytes(20000);
  const heilesZip = await zipBauen({ 'cermes.sqlite': datenbank, 'logo/x.png': bild }, true);
  const artikelNamen = () => oeffneDatenbank().prepare('SELECT name FROM artikel ORDER BY name').all()
    .map((zeile) => zeile.name);

  const abgelehnt = await admin.post('/api/backup/einspielen').attach('backup', einByteAendern(heilesZip, bild), 'kaputt.zip');
  assert.equal(abgelehnt.status, 500);
  assert.equal(abgelehnt.body.fehler,
    'Das Backup konnte nicht gelesen werden (Datei beschädigt oder Datenträger voll). Der bisherige Stand ist unverändert.');
  assert.deepEqual(artikelNamen(), ['Im Backup', 'Nur im laufenden Stand']);
  assert.equal(fs.existsSync(path.join(datenVerzeichnis(), 'logo', 'x.png')), false);
  const uebrig = fs.readdirSync(datenVerzeichnis())
    .filter((name) => name === 'einspielen-temp' || name.endsWith('.vor-einspielen'));
  assert.deepEqual(uebrig, []);
  assert.equal((await admin.get('/api/artikel')).status, 200, 'Admin bleibt angemeldet');

  const eingespielt = await admin.post('/api/backup/einspielen').attach('backup', heilesZip, 'heil.zip');
  assert.equal(eingespielt.status, 200);
  assert.deepEqual(fs.readFileSync(path.join(datenVerzeichnis(), 'logo', 'x.png')), bild);
  assert.deepEqual(artikelNamen(), ['Im Backup']);

  fs.rmSync(path.join(datenVerzeichnis(), 'cermes.sqlite.vor-einspielen'), { force: true });
  fs.rmSync(path.join(datenVerzeichnis(), 'logo'), { recursive: true, force: true });
});

test('Backup einspielen: ein ZIP ohne cermes.sqlite wird mit einem verständlichen Fehlersatz abgelehnt', async () => {
  const { app, db } = frischeApp();
  const admin = await angemeldeterAgent(app, db, 'admin');

  const antwort = await admin.post('/api/backup/einspielen')
    .attach('backup', await zipBauen({ 'logo/x.png': Buffer.alloc(10) }), 'ohne-datenbank.zip');

  assert.equal(antwort.status, 400);
  assert.equal(antwort.body.fehler,
    'In diesem ZIP fehlt die Datenbankdatei cermes.sqlite. Das ist kein Cermes-Backup.');
});
