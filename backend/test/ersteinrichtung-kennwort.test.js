import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { frischeApp } from './helfer.js';
import { einrichtungsKennwort } from '../src/auth.js';

for (const [fall, kennwort] of [['fehlt', undefined], ['falsch', 'falsches-kennwort'], ['kein Text', { a: 1 }]]) {
  test(`Ersteinrichtung: Kennwort ${fall}, weder Konto noch Sitzung`, async () => {
    const { app, db } = frischeApp();
    const agent = request.agent(app);
    const antwort = await agent.post('/api/ersteinrichtung')
      .send({ benutzername: 'gast', passwort: 'sehr-geheim', einrichtungsKennwort: kennwort });
    assert.equal(antwort.status, 403);
    assert.match(antwort.body.fehler, /Einrichtungskennwort/);
    assert.equal(db.prepare('SELECT COUNT(*) AS n FROM benutzer').get().n, 0);
    assert.equal((await agent.get('/api/session')).body.angemeldet, false);
    assert.equal((await request(app).get('/api/ersteinrichtung')).body.noetig, true);
  });
}

test('Ersteinrichtung: mit richtigem Kennwort entsteht das Admin-Konto mit Sitzung', async () => {
  const { app, db } = frischeApp();
  const agent = request.agent(app);
  const antwort = await agent.post('/api/ersteinrichtung')
    .send({ benutzername: 'chef', passwort: 'sehr-geheim', einrichtungsKennwort: einrichtungsKennwort() });
  assert.equal(antwort.status, 200);
  assert.equal(db.prepare('SELECT rolle FROM benutzer').get().rolle, 'admin');
  assert.equal((await agent.get('/api/session')).body.angemeldet, true);

  const zweite = await request(app).post('/api/ersteinrichtung')
    .send({ benutzername: 'x', passwort: 'sehr-geheim', einrichtungsKennwort: einrichtungsKennwort() });
  assert.equal(zweite.status, 409);
});
