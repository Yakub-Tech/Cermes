import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import unzipper from 'unzipper';
import { frischeApp, angemeldeterAgent } from './helfer.js';
import { oeffneDatenbank, schliesseDatenbank, datenVerzeichnis } from '../src/db.js';
import { testNeustartFunktionSetzen } from '../src/routen/backup.js';

testNeustartFunktionSetzen(() => {});

function backupHolen(agent) {
  return agent.get('/api/backup').buffer().parse((antwort, weiter) => {
    const teile = [];
    antwort.on('data', (teil) => teile.push(teil));
    antwort.on('end', () => weiter(null, Buffer.concat(teile)));
  });
}

test('Backup einspielen: zwei gleichzeitige Anfragen spielen nicht beide ein', async (t) => {
  const { app, db } = frischeApp();
  const admin = await angemeldeterAgent(app, db, 'admin');

  await admin.post('/api/artikel').send({
    name: 'Stand-A', farbe: '#f5c211', preis_cent: 100, beilagen_ids: [], sortierung: 1,
  });
  const backupA = await backupHolen(admin);

  await admin.post('/api/artikel').send({
    name: 'Stand-B', farbe: '#7a1a2f', preis_cent: 200, beilagen_ids: [], sortierung: 2,
  });
  const backupB = await backupHolen(admin);

  let ersterAufruf = true;
  let freigeben;
  const freigabe = new Promise((aufloesen) => { freigeben = aufloesen; });
  let meldeAngekommen;
  const angekommen = new Promise((aufloesen) => { meldeAngekommen = aufloesen; });

  const echtesOeffnen = unzipper.Open.buffer;
  t.mock.method(unzipper.Open, 'buffer', async function (...args) {
    const ergebnis = await echtesOeffnen.apply(this, args);
    if (ersterAufruf) {
      ersterAufruf = false;
      meldeAngekommen();
      await freigabe;
    }
    return ergebnis;
  });

  const anfrageB = admin.post('/api/backup/einspielen').attach('backup', backupB.body, 'b.zip').then((r) => r);
  await angekommen;
  const antwortA = await admin.post('/api/backup/einspielen').attach('backup', backupA.body, 'a.zip');
  freigeben();
  const antwortB = await anfrageB;
  t.mock.reset();

  const erfolge = [antwortA.status, antwortB.status].filter((s) => s === 200).length;
  assert.equal(erfolge, 1, `genau ein Einspielen darf durchlaufen (A=${antwortA.status}, B=${antwortB.status})`);

  schliesseDatenbank();
  const neueVerbindung = oeffneDatenbank();
  const namen = neueVerbindung.prepare('SELECT name FROM artikel ORDER BY name').all().map((z) => z.name);
  const erwartet = antwortA.status === 200 ? ['Stand-A'] : ['Stand-A', 'Stand-B'];
  assert.deepEqual(namen, erwartet, 'der Endstand gehört zu der Anfrage, die 200 bekommen hat');

  fs.rmSync(path.join(datenVerzeichnis(), 'cermes.sqlite.vor-einspielen'), { force: true });
});
