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
