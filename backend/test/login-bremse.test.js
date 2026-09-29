import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import bcrypt from 'bcryptjs';
import { frischeApp, auditStand, auditSeit } from './helfer.js';

function kontoAnlegen(db) {
  db.prepare('INSERT INTO benutzer (benutzername, passwort_hash, rolle, erstellt_am) VALUES (?, ?, ?, ?)')
    .run('helfer', bcrypt.hashSync('richtig', 4), 'kasse', '2026-01-01T00:00:00');
}

function anmelden(app, passwort) {
  return request(app).post('/api/login').send({ benutzername: 'helfer', passwort });
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
