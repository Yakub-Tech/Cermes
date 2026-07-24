import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import request from 'supertest';
import { frischeApp, angemeldeterAgent } from './helfer.js';

test('Einstellungen: lesen für Angemeldete, ändern nur als Admin', async () => {
  const { app, db } = frischeApp();
  const ausgabe = await angemeldeterAgent(app, db, 'ausgabe');
  let gelesen = (await ausgabe.get('/api/einstellungen')).body;
  assert.equal(gelesen.abholbereit_warnminuten, 15);
  assert.equal(gelesen.inaktivitaets_abmeldung_minuten, 30);

  const admin = await angemeldeterAgent(app, db, 'admin');
  await admin.put('/api/einstellungen').send({ abholbereit_warnminuten: 20 });
  await admin.put('/api/einstellungen').send({ inaktivitaets_abmeldung_minuten: 45 });
  gelesen = (await ausgabe.get('/api/einstellungen')).body;
  assert.equal(gelesen.abholbereit_warnminuten, 20);
  assert.equal(gelesen.inaktivitaets_abmeldung_minuten, 45);

  const kasse = await angemeldeterAgent(app, db, 'kasse');
  assert.equal((await kasse.put('/api/einstellungen').send({ abholbereit_warnminuten: 5 })).status, 403);
  assert.equal((await request(app).get('/api/einstellungen')).status, 401);

  await admin.put('/api/einstellungen').send({ abholbereit_warnminuten: 15, inaktivitaets_abmeldung_minuten: 30 });
});

test('Einstellungen: ungültige Zeit bis zur automatischen Abmeldung wird abgelehnt', async () => {
  const { app, db } = frischeApp();
  const admin = await angemeldeterAgent(app, db, 'admin');

  let antwort = await admin.put('/api/einstellungen').send({ inaktivitaets_abmeldung_minuten: 0 });
  assert.equal(antwort.status, 400);
  assert.match(antwort.body.fehler, /ganze Zahl ab 1 Minute/);

  antwort = await admin.put('/api/einstellungen').send({ inaktivitaets_abmeldung_minuten: 2.5 });
  assert.equal(antwort.status, 400);

  const gelesen = (await admin.get('/api/einstellungen')).body;
  assert.equal(gelesen.inaktivitaets_abmeldung_minuten, 30);
});

test('Werbung: Upload, Liste, TV-Sicht, Deaktivieren, Löschen', async () => {
  const { app, db } = frischeApp();
  const admin = await angemeldeterAgent(app, db, 'admin');

  const hochgeladen = await admin.post('/api/werbung')
    .attach('bild', Buffer.from([0x89, 0x50, 0x4e, 0x47]), 'test.png');
  assert.equal(hochgeladen.status, 200);
  const bild = hochgeladen.body;

  const liste = (await admin.get('/api/werbung')).body;
  assert.equal(liste.length, 1);
  assert.equal(liste[0].aktiv, 1);

  let tv = (await request(app).get('/api/tv/werbung')).body;
  assert.equal(tv.length, 1);
  assert.ok(tv[0].url.startsWith('/werbung/'));

  const datei = await request(app).get(tv[0].url);
  assert.equal(datei.status, 200);

  await admin.put(`/api/werbung/${bild.id}`).send({ aktiv: 0 });
  tv = (await request(app).get('/api/tv/werbung')).body;
  assert.equal(tv.length, 0);

  await admin.delete(`/api/werbung/${bild.id}`);
  assert.equal((await admin.get('/api/werbung')).body.length, 0);
  const werbeOrdner = path.join(process.env.DATEN_VERZEICHNIS, 'werbung');
  assert.equal(fs.readdirSync(werbeOrdner).length, 0);
});

test('Werbung: falscher Dateityp wird abgelehnt', async () => {
  const { app, db } = frischeApp();
  const admin = await angemeldeterAgent(app, db, 'admin');
  const antwort = await admin.post('/api/werbung')
    .attach('bild', Buffer.from('kein bild'), { filename: 'test.txt', contentType: 'text/plain' });
  assert.equal(antwort.status, 400);
});
