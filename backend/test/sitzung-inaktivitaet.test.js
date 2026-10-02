import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { frischeApp, angemeldeterAgent } from './helfer.js';
import { erstelleApp } from '../src/server.js';

const MINUTE = 60 * 1000;

async function anmeldenMitCookie(app, benutzername, passwort) {
  const antwort = await request(app).post('/api/login').send({ benutzername, passwort });
  assert.equal(antwort.status, 200);
  return antwort.headers['set-cookie'].map((zeile) => zeile.split(';')[0]).join('; ');
}

async function istAngemeldet(app, cookie) {
  const antwort = await request(app).get('/api/session').set('Cookie', cookie);
  return antwort.body.angemeldet;
}

function letzteAktivitaetSetzen(db, vorMs) {
  db.prepare('UPDATE sitzung SET letzte_aktivitaet_ms = ?').run(Date.now() - vorMs);
}

function letzteAktivitaet(db) {
  return db.prepare('SELECT letzte_aktivitaet_ms FROM sitzung').get().letzte_aktivitaet_ms;
}

function fristSetzen(db, wert) {
  db.prepare("UPDATE einstellung SET wert = ? WHERE schluessel = 'inaktivitaets_abmeldung_minuten'").run(wert);
}

async function kasseMitCookie() {
  const { app, db } = frischeApp();
  fristSetzen(db, '30');
  await angemeldeterAgent(app, db, 'kasse');
  db.prepare('DELETE FROM sitzung').run();
  const cookie = await anmeldenMitCookie(app, 'test-kasse', 'geheim');
  return { app, db, cookie };
}

test('Sitzung wird nach Ablauf der Frist ohne Logout abgelehnt und gelöscht', async () => {
  const { app, db, cookie } = await kasseMitCookie();
  letzteAktivitaetSetzen(db, 33 * MINUTE);

  const antwort = await request(app).get('/api/einstellungen').set('Cookie', cookie);

  assert.equal(antwort.status, 401);
  assert.equal(antwort.body.inaktiv, true);
  assert.match(antwort.body.fehler, /Inaktivität/);
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM sitzung').get().n, 0);
  assert.equal(await istAngemeldet(app, cookie), false);
});

test('Der Server meldet nicht früher ab als der Countdown im Browser (Toleranz)', async () => {
  const { app, db, cookie } = await kasseMitCookie();
  letzteAktivitaetSetzen(db, 31 * MINUTE);
  assert.equal(await istAngemeldet(app, cookie), true);
});

test('Hintergrundabfragen (GET) verlängern die Sitzung nicht', async () => {
  const { app, db, cookie } = await kasseMitCookie();
  letzteAktivitaetSetzen(db, 20 * MINUTE);
  const vorher = letzteAktivitaet(db);

  await request(app).get('/api/einstellungen').set('Cookie', cookie);
  await request(app).get('/api/session').set('Cookie', cookie);

  assert.equal(letzteAktivitaet(db), vorher);
});

test('Der Aktivitäts-Aufruf verlängert die Sitzung', async () => {
  const { app, db, cookie } = await kasseMitCookie();
  letzteAktivitaetSetzen(db, 20 * MINUTE);

  const antwort = await request(app).post('/api/aktivitaet').set('Cookie', cookie);

  assert.equal(antwort.status, 204);
  assert.ok(letzteAktivitaet(db) > Date.now() - MINUTE);
});

test('Der Aktivitäts-Aufruf ohne Sitzung wird abgelehnt', async () => {
  const { app } = frischeApp();
  const antwort = await request(app).post('/api/aktivitaet');
  assert.equal(antwort.status, 401);
});

test('Eine schreibende Anfrage verlängert die Sitzung', async () => {
  const { app, db } = frischeApp();
  fristSetzen(db, '30');
  const admin = await angemeldeterAgent(app, db, 'admin');
  letzteAktivitaetSetzen(db, 20 * MINUTE);

  const antwort = await admin.put('/api/einstellungen').send({ inaktivitaets_abmeldung_minuten: 30 });

  assert.equal(antwort.status, 200);
  assert.ok(letzteAktivitaet(db) > Date.now() - MINUTE);
});

test('Die eingestellte Minutenzahl bestimmt die Frist', async () => {
  const { app, db, cookie } = await kasseMitCookie();
  fristSetzen(db, '60');
  letzteAktivitaetSetzen(db, 45 * MINUTE);
  assert.equal(await istAngemeldet(app, cookie), true);

  fristSetzen(db, '5');
  letzteAktivitaetSetzen(db, 8 * MINUTE);
  assert.equal(await istAngemeldet(app, cookie), false);
});

test('Ein unbrauchbarer gespeicherter Wert (0) fällt auf 30 Minuten zurück wie im Browser', async () => {
  const { app, db, cookie } = await kasseMitCookie();
  fristSetzen(db, '0');
  letzteAktivitaetSetzen(db, 20 * MINUTE);
  assert.equal(await istAngemeldet(app, cookie), true);

  letzteAktivitaetSetzen(db, 33 * MINUTE);
  assert.equal(await istAngemeldet(app, cookie), false);
});

test('Der 24-Stunden-Ablauf gilt auch bei laufender Aktivität', async () => {
  const { app, db, cookie } = await kasseMitCookie();
  db.prepare('UPDATE sitzung SET ausgestellt_ms = ?, letzte_aktivitaet_ms = ?')
    .run(Date.now() - 25 * 60 * MINUTE, Date.now());
  assert.equal(await istAngemeldet(app, cookie), false);
});

test('Nur das inaktive Gerät wird abgemeldet, das aktive bleibt angemeldet', async () => {
  const { app, db } = frischeApp();
  fristSetzen(db, '30');
  await angemeldeterAgent(app, db, 'kasse');
  db.prepare('DELETE FROM sitzung').run();
  const geraetA = await anmeldenMitCookie(app, 'test-kasse', 'geheim');
  const geraetB = await anmeldenMitCookie(app, 'test-kasse', 'geheim');
  letzteAktivitaetSetzen(db, 33 * MINUTE);
  const idA = db.prepare('SELECT id FROM sitzung ORDER BY rowid LIMIT 1').get().id;
  db.prepare('UPDATE sitzung SET letzte_aktivitaet_ms = ? WHERE id = ?').run(Date.now(), idA);

  assert.equal(await istAngemeldet(app, geraetA), true);
  assert.equal(await istAngemeldet(app, geraetB), false);
});

test('Die letzte Aktivität liegt in der Datenbank und überlebt einen Neustart', async () => {
  const { app, db, cookie } = await kasseMitCookie();
  await request(app).post('/api/aktivitaet').set('Cookie', cookie);

  const nachNeustart = erstelleApp();
  assert.equal((await request(nachNeustart).get('/api/session').set('Cookie', cookie)).body.angemeldet, true);

  letzteAktivitaetSetzen(db, 33 * MINUTE);
  assert.equal((await request(nachNeustart).get('/api/session').set('Cookie', cookie)).body.angemeldet, false);
});

test('Logout und Passwortwechsel beenden die Sitzung weiterhin sofort', async () => {
  const { app, db, cookie } = await kasseMitCookie();
  await request(app).post('/api/logout').set('Cookie', cookie);
  assert.equal(await istAngemeldet(app, cookie), false);

  const zweites = await anmeldenMitCookie(app, 'test-kasse', 'geheim');
  await request(app).post('/api/passwort-aendern')
    .send({ benutzername: 'test-kasse', aktuellesPasswort: 'geheim', neuesPasswort: 'ganz-neues-passwort' });
  assert.equal(await istAngemeldet(app, zweites), false);
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM sitzung').get().n, 0);
});
