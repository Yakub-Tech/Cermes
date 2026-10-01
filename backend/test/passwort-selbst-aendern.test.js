import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import bcrypt from 'bcryptjs';
import { frischeApp, auditStand, auditSeit, angemeldeterAgent } from './helfer.js';

function kontoAnlegen(db, benutzername, rolle = 'kasse') {
  db.prepare('INSERT INTO benutzer (benutzername, passwort_hash, rolle, erstellt_am) VALUES (?, ?, ?, ?)')
    .run(benutzername, bcrypt.hashSync('altes-passwort', 4), rolle, '2026-01-01T00:00:00');
}

function aendern(app, daten) {
  return request(app).post('/api/passwort-aendern').send(daten);
}

const GUT = { benutzername: 'anna', aktuellesPasswort: 'altes-passwort', neuesPasswort: 'neues-passwort-1' };

test('Passwort ändern: mit richtigem Passwort geht es, danach gilt nur noch das neue', async () => {
  const { app, db } = frischeApp();
  kontoAnlegen(db, 'anna');
  assert.equal((await aendern(app, GUT)).status, 200);
  const alt = await request(app).post('/api/login').send({ benutzername: 'anna', passwort: 'altes-passwort' });
  assert.equal(alt.status, 401);
  const neu = await request(app).post('/api/login').send({ benutzername: 'anna', passwort: 'neues-passwort-1' });
  assert.equal(neu.status, 200);
});

test('Passwort ändern: alle Rollen dürfen es', async () => {
  const { app, db } = frischeApp();
  for (const rolle of ['admin', 'kasse', 'belegen', 'ausgabe', 'verwaltung']) {
    kontoAnlegen(db, `k-${rolle}`, rolle);
    const antwort = await aendern(app, { ...GUT, benutzername: `k-${rolle}` });
    assert.equal(antwort.status, 200, rolle);
  }
});

test('Passwort ändern: falsches Passwort und falscher Benutzer geben dieselbe Meldung', async () => {
  const { app, db } = frischeApp();
  kontoAnlegen(db, 'anna');
  const falschesPasswort = await aendern(app, { ...GUT, aktuellesPasswort: 'falsch' });
  const falscherBenutzer = await aendern(app, { ...GUT, benutzername: 'gibtsnicht' });
  assert.equal(falschesPasswort.status, 401);
  assert.equal(falscherBenutzer.status, 401);
  assert.equal(falschesPasswort.body.fehler, 'Benutzername oder aktuelles Passwort ist falsch.');
  assert.deepEqual(falscherBenutzer.body, falschesPasswort.body);
  assert.equal((await request(app).post('/api/login')
    .send({ benutzername: 'anna', passwort: 'altes-passwort' })).status, 200);
});

test('Passwort ändern: zu kurzes neues Passwort und gleiches Passwort werden abgelehnt', async () => {
  const { app, db } = frischeApp();
  kontoAnlegen(db, 'anna');
  const kurz = await aendern(app, { ...GUT, neuesPasswort: 'kurz' });
  assert.equal(kurz.status, 400);
  assert.equal(kurz.body.fehler, 'Das Passwort muss mindestens 8 Zeichen haben.');
  const gleich = await aendern(app, { ...GUT, neuesPasswort: 'altes-passwort' });
  assert.equal(gleich.status, 400);
  assert.equal(gleich.body.fehler, 'Das neue Passwort muss sich vom bisherigen unterscheiden.');
});

test('Passwort ändern: Fehlversuche zählen, nach 10 gibt es eine Pause, auch für das Login', async (t) => {
  t.mock.timers.enable({ apis: ['Date'], now: Date.now() });
  const { app, db } = frischeApp();
  kontoAnlegen(db, 'anna');
  for (let i = 0; i < 10; i += 1) {
    assert.equal((await aendern(app, { ...GUT, aktuellesPasswort: 'falsch' })).status, 401);
  }
  const gebremst = await aendern(app, GUT);
  assert.equal(gebremst.status, 429);
  assert.match(gebremst.body.fehler, /^Zu viele falsche Anmeldeversuche\. Bitte in \d+ Sekunden noch einmal versuchen\.$/);
  const login = await request(app).post('/api/login').send({ benutzername: 'anna', passwort: 'altes-passwort' });
  assert.equal(login.status, 429);
  t.mock.timers.tick(30 * 1000 + 1);
  assert.equal((await aendern(app, GUT)).status, 200);
});

test('Passwort ändern: bestehende Sitzungen des Kontos enden, andere bleiben', async () => {
  const { app, db } = frischeApp();
  kontoAnlegen(db, 'anna');
  kontoAnlegen(db, 'berta');
  const annaAgent = request.agent(app);
  await annaAgent.post('/api/login').send({ benutzername: 'anna', passwort: 'altes-passwort' });
  const bertaAgent = request.agent(app);
  await bertaAgent.post('/api/login').send({ benutzername: 'berta', passwort: 'altes-passwort' });
  await aendern(app, GUT);
  assert.equal((await annaAgent.get('/api/session')).body.angemeldet, false);
  assert.equal((await bertaAgent.get('/api/session')).body.angemeldet, true);
});

test('Passwort ändern: meldet nicht automatisch an', async () => {
  const { app, db } = frischeApp();
  kontoAnlegen(db, 'anna');
  const agent = request.agent(app);
  await agent.post('/api/passwort-aendern').send(GUT);
  assert.equal((await agent.get('/api/session')).body.angemeldet, false);
});

test('Passwort ändern: Audit-Eintrag ohne Passwörter, Fehlversuch wird auch protokolliert', async () => {
  const { app, db } = frischeApp();
  kontoAnlegen(db, 'anna');
  const stand = auditStand(db);
  await aendern(app, { ...GUT, aktuellesPasswort: 'FALSCH-GEHEIM-1' });
  await aendern(app, { ...GUT, neuesPasswort: 'NEU-GEHEIM-2222' });
  const eintraege = auditSeit(db, stand);
  assert.deepEqual(eintraege.map((e) => e.aktion), ['passwort_aendern_fehlgeschlagen', 'passwort_selbst_geaendert']);
  assert.ok(eintraege.every((e) => e.benutzername === 'anna' || e.aktion === 'passwort_aendern_fehlgeschlagen'));
  assert.deepEqual(eintraege[1].details.werte, { konto: 'anna' });
  assert.equal(eintraege[1].rolle, 'kasse');
  const alles = JSON.stringify(db.prepare('SELECT * FROM audit_eintrag').all());
  assert.ok(!alles.includes('GEHEIM-'));
  assert.ok(!alles.includes('altes-passwort'));
  assert.ok(!alles.includes('$2'), 'kein bcrypt-Hash im Log');
});

test('Passwort ändern: fehlende oder falsch getypte Felder geben keinen Absturz', async () => {
  const { app, db } = frischeApp();
  kontoAnlegen(db, 'anna');
  assert.equal((await aendern(app, {})).status, 401);
  assert.equal((await aendern(app, { benutzername: ['anna'], aktuellesPasswort: 5, neuesPasswort: {} })).status, 401);
  assert.equal((await aendern(app, { ...GUT, neuesPasswort: 12345678 })).status, 400);
});

test('Passwort ändern: mehr als 72 Bytes werden abgelehnt, genau 72 gehen', async () => {
  const { app, db } = frischeApp();
  kontoAnlegen(db, 'anna');
  for (const zuLang of ['a'.repeat(73), 'ä'.repeat(37)]) {
    const antwort = await aendern(app, { ...GUT, neuesPasswort: zuLang });
    assert.equal(antwort.status, 400);
    assert.match(antwort.body.fehler, /zu lang/);
  }
  assert.equal((await aendern(app, { ...GUT, neuesPasswort: 'a'.repeat(72) })).status, 200);
});

test('Anlegen und Setzen durch den Admin lehnen Passwörter über 72 Bytes ab', async () => {
  const { app, db } = frischeApp();
  const admin = await angemeldeterAgent(app, db, 'admin');
  const anlegen = await admin.post('/api/benutzer')
    .send({ benutzername: 'neu', passwort: 'a'.repeat(73), rolle: 'kasse' });
  assert.equal(anlegen.status, 400);
  assert.match(anlegen.body.fehler, /zu lang/);
  const konto = (await admin.post('/api/benutzer')
    .send({ benutzername: 'neu', passwort: 'a'.repeat(72), rolle: 'kasse' })).body;
  const setzen = await admin.post(`/api/benutzer/${konto.id}/passwort`).send({ passwort: 'a'.repeat(73) });
  assert.equal(setzen.status, 400);
  assert.match(setzen.body.fehler, /zu lang/);
});

test('Passwort ändern: Altkonto mit Passwort über 72 Bytes, gekürzte Fassung gilt als gleich', async () => {
  const { app, db } = frischeApp();
  db.prepare('INSERT INTO benutzer (benutzername, passwort_hash, rolle, erstellt_am) VALUES (?, ?, ?, ?)')
    .run('anna', bcrypt.hashSync('a'.repeat(72) + 'alt', 4), 'kasse', '2026-01-01T00:00:00');
  const antwort = await aendern(app, {
    benutzername: 'anna', aktuellesPasswort: 'a'.repeat(72) + 'alt', neuesPasswort: 'a'.repeat(72),
  });
  assert.equal(antwort.status, 400);
  assert.equal(antwort.body.fehler, 'Das neue Passwort muss sich vom bisherigen unterscheiden.');
});

test('Ersteinrichtung: Passwort über 72 Bytes wird abgelehnt', async () => {
  const { app } = frischeApp();
  const antwort = await request(app).post('/api/ersteinrichtung')
    .send({ benutzername: 'chef', passwort: 'a'.repeat(73) });
  assert.equal(antwort.status, 400);
  assert.match(antwort.body.fehler, /zu lang/);
});
