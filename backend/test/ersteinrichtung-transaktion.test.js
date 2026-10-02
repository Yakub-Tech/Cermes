import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { frischeApp } from './helfer.js';
import { einrichtungsKennwort } from '../src/auth.js';

test('Ersteinrichtung: scheitert das Protokollieren, bleibt kein Konto ohne Eintrag zurück', async () => {
  const { app, db } = frischeApp();

  db.exec(`CREATE TRIGGER test_audit_scheitert BEFORE INSERT ON audit_eintrag
    BEGIN SELECT RAISE(ABORT, 'Testfehler: Datenträger voll'); END;`);

  const antwort = await request.agent(app).post('/api/ersteinrichtung')
    .send({ benutzername: 'erster-admin', passwort: 'geheimgeheim', einrichtungsKennwort: einrichtungsKennwort() });

  assert.equal(antwort.status, 500);
  assert.match(antwort.body.fehler, /noch einmal/);
  assert.doesNotMatch(antwort.body.fehler, /Error|SQLITE|undefined/);

  const anzahl = db.prepare('SELECT COUNT(*) AS n FROM benutzer').get().n;
  assert.equal(anzahl, 0, 'kein Konto ohne begleitenden Log-Eintrag');

  db.exec('DROP TRIGGER test_audit_scheitert');
});

test('Ersteinrichtung: gelingt sie, sind Konto und Log-Eintrag beide da', async () => {
  const { app, db } = frischeApp();

  const antwort = await request.agent(app).post('/api/ersteinrichtung')
    .send({ benutzername: 'erster-admin', passwort: 'geheimgeheim', einrichtungsKennwort: einrichtungsKennwort() });

  assert.equal(antwort.status, 200);
  const benutzer = db.prepare('SELECT * FROM benutzer').get();
  assert.equal(benutzer.benutzername, 'erster-admin');
  const eintrag = db.prepare("SELECT * FROM audit_eintrag WHERE aktion = 'ersteinrichtung'").get();
  assert.equal(eintrag.benutzername, 'erster-admin');
});
