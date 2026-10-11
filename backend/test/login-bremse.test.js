import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import bcrypt from 'bcryptjs';
import { frischeApp, auditStand, auditSeit } from './helfer.js';

function kontoAnlegen(db, benutzername = 'helfer') {
  db.prepare('INSERT INTO benutzer (benutzername, passwort_hash, rolle, erstellt_am) VALUES (?, ?, ?, ?)')
    .run(benutzername, bcrypt.hashSync('richtig', 4), 'kasse', '2026-01-01T00:00:00');
}

function anmelden(app, passwort, benutzername = 'helfer') {
  return request(app).post('/api/login').send({ benutzername, passwort });
}

test('Login-Bremse: nach 10 Fehlversuchen kurze Pause mit deutschem Hinweis, danach geht es von selbst wieder', async (t) => {
  t.mock.timers.enable({ apis: ['Date'], now: Date.now() });
  const { app, db } = frischeApp();
  kontoAnlegen(db);

  for (let i = 0; i < 10; i += 1) {
    assert.equal((await anmelden(app, 'falsch')).status, 401);
  }

  const stand = auditStand(db);
  const gebremst = await anmelden(app, 'richtig');
  assert.equal(gebremst.status, 429);
  assert.match(gebremst.body.fehler, /^Zu viele falsche Anmeldeversuche\. Bitte in \d+ Sekunden noch einmal versuchen\.$/);
  assert.equal(auditSeit(db, stand).length, 0);

  t.mock.timers.tick(30 * 1000 + 1);
  assert.equal((await anmelden(app, 'richtig')).status, 200);
});

test('Login-Bremse: eine erfolgreiche Anmeldung setzt den Zähler zurück', async () => {
  const { app, db } = frischeApp();
  kontoAnlegen(db);

  for (let i = 0; i < 9; i += 1) await anmelden(app, 'falsch');
  assert.equal((await anmelden(app, 'richtig')).status, 200);
  for (let i = 0; i < 9; i += 1) {
    assert.equal((await anmelden(app, 'falsch')).status, 401);
  }
  assert.equal((await anmelden(app, 'richtig')).status, 200);
});

test('Login-Bremse: zehn Fehlversuche bei einem Konto sperren ein anderes Konto derselben Adresse nicht', async (t) => {
  t.mock.timers.enable({ apis: ['Date'], now: Date.now() });
  const { app, db } = frischeApp();
  kontoAnlegen(db);
  kontoAnlegen(db, 'helfer2');

  for (let i = 0; i < 10; i += 1) {
    assert.equal((await anmelden(app, 'falsch')).status, 401);
  }

  assert.equal((await anmelden(app, 'richtig')).status, 429);
  assert.equal((await anmelden(app, 'richtig', 'helfer2')).status, 200);

  t.mock.timers.tick(30 * 1000 + 1);
  assert.equal((await anmelden(app, 'richtig')).status, 200);
});

test('Login-Bremse: ein erfolgreicher Login eines anderen Kontos setzt den Zähler nicht zurück', async (t) => {
  t.mock.timers.enable({ apis: ['Date'], now: Date.now() });
  const { app, db } = frischeApp();
  kontoAnlegen(db);
  kontoAnlegen(db, 'helfer2');

  for (let i = 0; i < 9; i += 1) {
    assert.equal((await anmelden(app, 'falsch')).status, 401);
  }
  assert.equal((await anmelden(app, 'richtig', 'helfer2')).status, 200);
  assert.equal((await anmelden(app, 'falsch')).status, 401);

  assert.equal((await anmelden(app, 'richtig')).status, 429);

  t.mock.timers.tick(30 * 1000 + 1);
  assert.equal((await anmelden(app, 'richtig')).status, 200);
});

test('Login-Bremse: unbekannte Namen zählen gemeinsam je Adresse und sperren bekannte Konten nicht', async (t) => {
  t.mock.timers.enable({ apis: ['Date'], now: Date.now() });
  const { app, db } = frischeApp();
  kontoAnlegen(db);

  for (let i = 0; i < 10; i += 1) {
    assert.equal((await anmelden(app, 'falsch', `erfunden${i}`)).status, 401);
  }

  assert.equal((await anmelden(app, 'falsch', 'erfunden10')).status, 429);
  assert.equal((await anmelden(app, 'richtig')).status, 200);
});
