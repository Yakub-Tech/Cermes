import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import bcrypt from 'bcryptjs';
import { frischeApp } from './helfer.js';

function kontoAnlegen(db, benutzername) {
  db.prepare('INSERT INTO benutzer (benutzername, passwort_hash, rolle, erstellt_am) VALUES (?, ?, ?, ?)')
    .run(benutzername, bcrypt.hashSync('richtig', 4), 'kasse', '2026-01-01T00:00:00');
}

test('Login: auch bei unbekanntem Namen läuft ein bcrypt-Vergleich mit Kostenfaktor 10', async (t) => {
  const { app } = frischeApp();
  const vergleich = t.mock.method(bcrypt, 'compareSync');

  const antwort = await request(app).post('/api/login').send({ benutzername: 'gibtesnicht', passwort: 'falsch' });

  assert.equal(antwort.status, 401);
  assert.equal(antwort.body.fehler, 'Benutzername oder Passwort ist falsch.');
  assert.equal(vergleich.mock.callCount(), 1);
  assert.equal(bcrypt.getRounds(vergleich.mock.calls[0].arguments[1]), 10);
});

test('Passwort ändern: auch bei unbekanntem Namen läuft ein bcrypt-Vergleich mit Kostenfaktor 10', async (t) => {
  const { app } = frischeApp();
  const vergleich = t.mock.method(bcrypt, 'compareSync');

  const antwort = await request(app).post('/api/passwort-aendern')
    .send({ benutzername: 'gibtesnicht', aktuellesPasswort: 'falsch', neuesPasswort: 'neues-passwort-1' });

  assert.equal(antwort.status, 401);
  assert.equal(antwort.body.fehler, 'Benutzername oder aktuelles Passwort ist falsch.');
  assert.equal(vergleich.mock.callCount(), 1);
  assert.equal(bcrypt.getRounds(vergleich.mock.calls[0].arguments[1]), 10);
});

test('Login: bekannter und unbekannter Name bekommen dieselbe Meldung', async () => {
  const { app, db } = frischeApp();
  kontoAnlegen(db, 'helfer');

  const bekannt = await request(app).post('/api/login').send({ benutzername: 'helfer', passwort: 'falsch' });
  const unbekannt = await request(app).post('/api/login').send({ benutzername: 'niemand', passwort: 'falsch' });

  assert.equal(bekannt.status, 401);
  assert.equal(unbekannt.status, 401);
  assert.equal(bekannt.body.fehler, unbekannt.body.fehler);
  assert.equal((await request(app).post('/api/login').send({ benutzername: 'helfer', passwort: 'richtig' })).status, 200);
});

test('Während einer Bremspause läuft kein bcrypt-Vergleich', async (t) => {
  t.mock.timers.enable({ apis: ['Date'], now: Date.now() });
  const { app } = frischeApp();

  for (let i = 0; i < 10; i += 1) {
    await request(app).post('/api/login').send({ benutzername: `erfunden${i}`, passwort: 'falsch' });
  }

  const vergleich = t.mock.method(bcrypt, 'compareSync');
  const login = await request(app).post('/api/login').send({ benutzername: 'erfunden10', passwort: 'falsch' });
  const aendern = await request(app).post('/api/passwort-aendern')
    .send({ benutzername: 'erfunden11', aktuellesPasswort: 'falsch', neuesPasswort: 'neues-passwort-1' });

  assert.equal(login.status, 429);
  assert.equal(aendern.status, 429);
  assert.equal(vergleich.mock.callCount(), 0);
});
