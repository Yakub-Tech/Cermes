import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { frischeApp, angemeldeterAgent } from './helfer.js';

test('Ersteinrichtung nur ohne Benutzer möglich', async () => {
  const { app } = frischeApp();
  assert.equal((await request(app).get('/api/ersteinrichtung')).body.noetig, true);
  const antwort = await request(app).post('/api/ersteinrichtung')
    .send({ benutzername: 'chef', passwort: 'sehr-geheim' });
  assert.equal(antwort.status, 200);
  const zweite = await request(app).post('/api/ersteinrichtung')
    .send({ benutzername: 'x', passwort: 'y' });
  assert.equal(zweite.status, 409);
});

test('Login liefert Rolle, falsches Passwort 401', async () => {
  const { app, db } = frischeApp();
  await angemeldeterAgent(app, db, 'kasse');
  const gut = await request(app).post('/api/login')
    .send({ benutzername: 'test-kasse', passwort: 'geheim' });
  assert.equal(gut.status, 200);
  assert.equal(gut.body.rolle, 'kasse');
  const schlecht = await request(app).post('/api/login')
    .send({ benutzername: 'test-kasse', passwort: 'falsch' });
  assert.equal(schlecht.status, 401);
});

test('Rollentrennung: Kassen-Konto kommt nicht an Admin-Routen', async () => {
  const { app, db } = frischeApp();
  const kasse = await angemeldeterAgent(app, db, 'kasse');
  assert.equal((await kasse.get('/api/artikel')).status, 403);
  assert.equal((await request(app).get('/api/artikel')).status, 401);
});

test('Benutzerverwaltung: anlegen, letzter Admin geschützt, Passwort-Reset', async () => {
  const { app, db } = frischeApp();
  const admin = await angemeldeterAgent(app, db, 'admin');
  const adminId = db.prepare("SELECT id FROM benutzer WHERE benutzername = 'test-admin'").get().id;

  assert.equal((await admin.delete(`/api/benutzer/${adminId}`)).status, 409);

  const zweiter = (await admin.post('/api/benutzer').send({
    benutzername: 'chef2', passwort: 'sehr-geheim', rolle: 'admin',
  })).body;
  const liste = (await admin.get('/api/benutzer')).body;
  assert.equal(liste.length, 2);
  assert.equal(liste[0].passwort_hash, undefined);
  assert.equal((await admin.delete(`/api/benutzer/${zweiter.id}`)).status, 200);

  const kassierer = (await admin.post('/api/benutzer').send({
    benutzername: 'kasse1', passwort: 'altes-passwort', rolle: 'kasse',
  })).body;
  await admin.post(`/api/benutzer/${kassierer.id}/passwort`).send({ passwort: 'neues-passwort' });
  const alt = await request(app).post('/api/login')
    .send({ benutzername: 'kasse1', passwort: 'altes-passwort' });
  assert.equal(alt.status, 401);
  const neu = await request(app).post('/api/login')
    .send({ benutzername: 'kasse1', passwort: 'neues-passwort' });
  assert.equal(neu.status, 200);
});

test('Backup-Download liefert eine ZIP-Datei', async () => {
  const { app, db } = frischeApp();
  const admin = await angemeldeterAgent(app, db, 'admin');
  const antwort = await admin.get('/api/backup').buffer().parse((res, weiter) => {
    const teile = [];
    res.on('data', (teil) => teile.push(teil));
    res.on('end', () => weiter(null, Buffer.concat(teile)));
  });
  assert.equal(antwort.status, 200);
  assert.equal(antwort.headers['content-type'], 'application/zip');
  assert.ok(antwort.headers['content-disposition'].includes('cermes-backup-'));
  assert.equal(antwort.body.subarray(0, 2).toString(), 'PK');
});
