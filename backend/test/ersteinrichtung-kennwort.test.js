import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
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

test('Konfiguration: kein festes Einrichtungskennwort in docker-compose.yml, .env nie im Git', () => {
  const projekt = path.join(import.meta.dirname, '..', '..');
  const compose = fs.readFileSync(path.join(projekt, 'docker-compose.yml'), 'utf8');
  assert.match(compose, /CERMES_EINRICHTUNGSKENNWORT=\$\{CERMES_EINRICHTUNGSKENNWORT:-\}/);
  const gitignore = fs.readFileSync(path.join(projekt, '.gitignore'), 'utf8').split('\n');
  assert.ok(gitignore.includes('.env'));
  const beispiel = fs.readFileSync(path.join(projekt, '.env.beispiel'), 'utf8');
  assert.match(beispiel, /^CERMES_EINRICHTUNGSKENNWORT=$/m);
});

test('Ersteinrichtung: Kennwort kommt aus CERMES_EINRICHTUNGSKENNWORT, keine Datei im Datenordner', async () => {
  const vorher = process.env.CERMES_EINRICHTUNGSKENNWORT;
  process.env.CERMES_EINRICHTUNGSKENNWORT = 'Test-Kennwort-47';
  try {
    const { app } = frischeApp();
    const antwort = await request(app).post('/api/ersteinrichtung')
      .send({ benutzername: 'chef', passwort: 'sehr-geheim', einrichtungsKennwort: 'Test-Kennwort-47' });
    assert.equal(antwort.status, 200);
    assert.equal(fs.existsSync(path.join(process.env.DATEN_VERZEICHNIS, 'einrichtungs-kennwort')), false);
  } finally {
    process.env.CERMES_EINRICHTUNGSKENNWORT = vorher;
  }
});

for (const eingabe of ['', 'irgendwas']) {
  test(`Ersteinrichtung: ohne Umgebungsvariable gesperrt (Eingabe "${eingabe}")`, async () => {
    const vorher = process.env.CERMES_EINRICHTUNGSKENNWORT;
    delete process.env.CERMES_EINRICHTUNGSKENNWORT;
    try {
      const { app, db } = frischeApp();
      const antwort = await request(app).post('/api/ersteinrichtung')
        .send({ benutzername: 'gast', passwort: 'sehr-geheim', einrichtungsKennwort: eingabe });
      assert.equal(antwort.status, 403);
      assert.match(antwort.body.fehler, /gesperrt/);
      assert.equal(db.prepare('SELECT COUNT(*) AS n FROM benutzer').get().n, 0);
    } finally {
      process.env.CERMES_EINRICHTUNGSKENNWORT = vorher;
    }
  });
}
