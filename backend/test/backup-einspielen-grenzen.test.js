import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import archiver from 'archiver';
import unzipper from 'unzipper';
import { frischeApp, angemeldeterAgent } from './helfer.js';
import { entpacken } from '../src/backupEinspielen.js';
import { testNeustartFunktionSetzen } from '../src/routen/backup.js';

testNeustartFunktionSetzen(() => {});

function zipBauen(dateien) {
  return new Promise((erfuellt, abgelehnt) => {
    const zip = archiver('zip');
    const teile = [];
    zip.on('data', (teil) => teile.push(teil));
    zip.on('end', () => erfuellt(Buffer.concat(teile)));
    zip.on('error', abgelehnt);
    for (const [name, inhalt] of Object.entries(dateien)) zip.append(inhalt, { name });
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
