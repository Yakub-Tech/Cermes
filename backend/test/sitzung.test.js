import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { frischeApp, angemeldeterAgent } from './helfer.js';

async function anmeldenMitCookie(app, benutzername, passwort) {
  const antwort = await request(app).post('/api/login').send({ benutzername, passwort });
  assert.equal(antwort.status, 200);
  return antwort.headers['set-cookie'].map((zeile) => zeile.split(';')[0]).join('; ');
}

async function istAngemeldet(app, cookie) {
  const antwort = await request(app).get('/api/session').set('Cookie', cookie);
  return antwort.body.angemeldet;
}

function benutzerAnlegen(db, name) {
  return db.prepare('INSERT INTO benutzer (benutzername, passwort_hash, rolle, erstellt_am) VALUES (?, ?, ?, ?)')
    .run(name, '$2a$04$abcdefghijklmnopqrstuuFakeHashFakeHashFakeHashFakeHashFake', 'ausgabe', '2026-01-01T00:00:00');
}

test('Alte Sitzung bleibt ungültig, wenn nach dem Löschen ein neues Konto angelegt wird', async () => {
  const { app, db } = frischeApp();
  const admin = await angemeldeterAgent(app, db, 'admin');
  await angemeldeterAgent(app, db, 'ausgabe');
  const altesCookie = await anmeldenMitCookie(app, 'test-ausgabe', 'geheim');
  const alteId = db.prepare("SELECT id FROM benutzer WHERE benutzername = 'test-ausgabe'").get().id;

  await admin.delete(`/api/benutzer/${alteId}`);
  const neu = await admin.post('/api/benutzer').send({ benutzername: 'neuer-admin', passwort: 'sehr-geheim', rolle: 'admin' });

  assert.notEqual(neu.body.id, alteId, 'Kontonummern werden nie wiederverwendet');
  assert.equal(await istAngemeldet(app, altesCookie), false);
});

test('Nach dem Abmelden ist das kopierte Cookie wertlos, andere Geräte bleiben angemeldet', async () => {
  const { app, db } = frischeApp();
  await angemeldeterAgent(app, db, 'kasse');
  const geraetA = await anmeldenMitCookie(app, 'test-kasse', 'geheim');
  const geraetB = await anmeldenMitCookie(app, 'test-kasse', 'geheim');

  await request(app).post('/api/logout').set('Cookie', geraetA);

  assert.equal(await istAngemeldet(app, geraetA), false);
  assert.equal(await istAngemeldet(app, geraetB), true);
});

test('Passwortwechsel beendet alle Sitzungen dieses Kontos, nicht die anderer Konten', async () => {
  const { app, db } = frischeApp();
  const admin = await angemeldeterAgent(app, db, 'admin');
  await angemeldeterAgent(app, db, 'kasse');
  await angemeldeterAgent(app, db, 'ausgabe');
  const kasseCookie = await anmeldenMitCookie(app, 'test-kasse', 'geheim');
  const ausgabeCookie = await anmeldenMitCookie(app, 'test-ausgabe', 'geheim');
  const kasseId = db.prepare("SELECT id FROM benutzer WHERE benutzername = 'test-kasse'").get().id;

  await admin.post(`/api/benutzer/${kasseId}/passwort`).send({ passwort: 'ganz-neues-passwort' });

  assert.equal(await istAngemeldet(app, kasseCookie), false);
  assert.equal(await istAngemeldet(app, ausgabeCookie), true);
});

test('Sitzung läuft serverseitig nach 24 Stunden ab', async () => {
  const { app, db } = frischeApp();
  await angemeldeterAgent(app, db, 'kasse');
  const cookie = await anmeldenMitCookie(app, 'test-kasse', 'geheim');
  assert.equal(await istAngemeldet(app, cookie), true);

  db.prepare('UPDATE sitzung SET ausgestellt_ms = ?').run(Date.now() - 25 * 60 * 60 * 1000);

  assert.equal(await istAngemeldet(app, cookie), false);
});

test('Ein gelöschtes Konto bekommt keine Kontonummer zurück, auch nicht die höchste', () => {
  const { db } = frischeApp();
  const erste = benutzerAnlegen(db, 'a').lastInsertRowid;
  db.prepare('DELETE FROM benutzer WHERE id = ?').run(erste);
  const zweite = benutzerAnlegen(db, 'b').lastInsertRowid;
  assert.ok(zweite > erste);
});
