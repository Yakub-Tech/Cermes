import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { frischeApp, angemeldeterAgent } from './helfer.js';
import { leseAuditSeite, leseBenutzerListe, EINTRAEGE_PRO_SEITE } from '../src/auditLesen.js';

function eintragAnlegen(db, { zeitpunkt, benutzername, bereich = 'kasse', aktion = 'kassiert' }) {
  db.prepare(
    `INSERT INTO audit_eintrag (zeitpunkt, benutzername, rolle, bereich, aktion, details)
     VALUES (?, ?, 'kasse', ?, ?, '{"werte":{"nummer":7}}')`
  ).run(zeitpunkt, benutzername, bereich, aktion);
}

test('Einträge kommen mit geparsten Details, neueste zuerst', () => {
  const { db } = frischeApp();
  eintragAnlegen(db, { zeitpunkt: '2026-09-01T10:00:00+02:00', benutzername: 'lese-reihenfolge' });
  eintragAnlegen(db, { zeitpunkt: '2026-09-01T11:00:00+02:00', benutzername: 'lese-reihenfolge' });

  const ergebnis = leseAuditSeite(db, { benutzer: 'lese-reihenfolge' });

  assert.equal(ergebnis.gesamt, 2);
  assert.equal(ergebnis.eintraege[0].zeitpunkt, '2026-09-01T11:00:00+02:00');
  assert.equal(ergebnis.eintraege[1].zeitpunkt, '2026-09-01T10:00:00+02:00');
  assert.deepEqual(ergebnis.eintraege[0].details, { werte: { nummer: 7 } });
});

test('Filter nach Bereich', () => {
  const { db } = frischeApp();
  eintragAnlegen(db, { zeitpunkt: '2026-09-01T10:00:00+02:00', benutzername: 'lese-bereich', bereich: 'kasse' });
  eintragAnlegen(db, { zeitpunkt: '2026-09-01T10:01:00+02:00', benutzername: 'lese-bereich', bereich: 'storno' });

  const nurStorno = leseAuditSeite(db, { benutzer: 'lese-bereich', bereich: 'storno' });
  assert.equal(nurStorno.gesamt, 1);
  assert.equal(nurStorno.eintraege[0].bereich, 'storno');

  assert.equal(leseAuditSeite(db, { benutzer: 'lese-bereich', bereich: '' }).gesamt, 2);
});

test('Filter nach Zeitraum, Grenzen inklusive', () => {
  const { db } = frischeApp();
  for (const tag of ['2026-08-30', '2026-08-31', '2026-09-01', '2026-09-02']) {
    eintragAnlegen(db, { zeitpunkt: `${tag}T23:59:59+02:00`, benutzername: 'lese-zeitraum' });
  }

  const ergebnis = leseAuditSeite(db, { benutzer: 'lese-zeitraum', von: '2026-08-31', bis: '2026-09-01' });
  assert.equal(ergebnis.gesamt, 2);
  assert.deepEqual(ergebnis.eintraege.map((e) => e.zeitpunkt.slice(0, 10)), ['2026-09-01', '2026-08-31']);

  assert.equal(leseAuditSeite(db, { benutzer: 'lese-zeitraum', von: '2026-09-02' }).gesamt, 1);
  assert.equal(leseAuditSeite(db, { benutzer: 'lese-zeitraum', bis: '2026-08-30' }).gesamt, 1);
});

test('Benutzerfilter trifft nur exakt diesen Benutzernamen, nicht ähnliche', () => {
  const { db } = frischeApp();
  eintragAnlegen(db, { zeitpunkt: '2026-09-01T10:00:00+02:00', benutzername: 'anna' });
  eintragAnlegen(db, { zeitpunkt: '2026-09-01T10:00:00+02:00', benutzername: 'anna-zwei' });

  const ergebnis = leseAuditSeite(db, { benutzer: 'anna' });
  assert.equal(ergebnis.gesamt, 1);
  assert.equal(ergebnis.eintraege[0].benutzername, 'anna');
});

test('leseBenutzerListe liefert jeden vorgekommenen Namen einmal, alphabetisch sortiert', () => {
  const { db } = frischeApp();
  eintragAnlegen(db, { zeitpunkt: '2026-09-01T10:00:00+02:00', benutzername: 'liste-Bernd' });
  eintragAnlegen(db, { zeitpunkt: '2026-09-01T11:00:00+02:00', benutzername: 'liste-Anna' });
  eintragAnlegen(db, { zeitpunkt: '2026-09-01T09:00:00+02:00', benutzername: 'liste-Chris-geloescht' });
  eintragAnlegen(db, { zeitpunkt: '2026-09-01T12:00:00+02:00', benutzername: 'liste-Anna' });

  const eigene = leseBenutzerListe(db).filter((name) => name.startsWith('liste-'));
  assert.deepEqual(eigene, ['liste-Anna', 'liste-Bernd', 'liste-Chris-geloescht']);
});

test('leseBenutzerListe liefert eine Liste (kein Fehler) ohne Filter-Argument', () => {
  const { db } = frischeApp();
  assert.ok(Array.isArray(leseBenutzerListe(db)));
});

test('Paging teilt in Seiten und liefert die Gesamtzahl', () => {
  const { db } = frischeApp();
  const anzahl = EINTRAEGE_PRO_SEITE * 2 + 3;
  for (let i = 0; i < anzahl; i += 1) {
    const sekunde = String(i % 60).padStart(2, '0');
    const minute = String(Math.floor(i / 60)).padStart(2, '0');
    eintragAnlegen(db, { zeitpunkt: `2026-09-01T10:${minute}:${sekunde}+02:00`, benutzername: 'lese-paging' });
  }

  const erste = leseAuditSeite(db, { benutzer: 'lese-paging' });
  assert.equal(erste.gesamt, anzahl);
  assert.equal(erste.seiten, 3);
  assert.equal(erste.seite, 1);
  assert.equal(erste.eintraege.length, EINTRAEGE_PRO_SEITE);

  const letzte = leseAuditSeite(db, { benutzer: 'lese-paging', seite: '3' });
  assert.equal(letzte.seite, 3);
  assert.equal(letzte.eintraege.length, 3);
  assert.ok(letzte.eintraege[0].id < erste.eintraege.at(-1).id);
});

test('Ohne Treffer gibt es genau eine leere Seite', () => {
  const { db } = frischeApp();
  const ergebnis = leseAuditSeite(db, { benutzer: 'gibt-es-nicht-xyz' });
  assert.deepEqual(ergebnis, { eintraege: [], gesamt: 0, seite: 1, seiten: 1 });
});

test('Ungültige Eingaben ergeben verständliche deutsche Fehler mit Status 400', () => {
  const { db } = frischeApp();
  const faelle = [
    [{ bereich: 'unfug' }, /Bereich/],
    [{ von: 'gestern' }, /Datum/],
    [{ bis: '2026-9-1' }, /Datum/],
    [{ seite: '0' }, /Seite/],
    [{ seite: 'abc' }, /Seite/],
  ];
  for (const [filter, muster] of faelle) {
    assert.throws(() => leseAuditSeite(db, filter), (fehler) => {
      assert.equal(fehler.status, 400);
      assert.match(fehler.message, muster);
      return true;
    });
  }
});

test('API: nur der Admin darf lesen, alle anderen Rollen werden verständlich abgewiesen', async () => {
  const { app, db } = frischeApp();
  eintragAnlegen(db, { zeitpunkt: '2026-09-01T10:00:00+02:00', benutzername: 'lese-api' });

  const ohneLogin = await request(app).get('/api/audit');
  assert.equal(ohneLogin.status, 401);
  assert.equal(ohneLogin.body.fehler, 'Bitte zuerst anmelden.');

  for (const rolle of ['kasse', 'ausgabe', 'belegen', 'verwaltung']) {
    const agent = await angemeldeterAgent(app, db, rolle);
    const antwort = await agent.get('/api/audit?benutzer=lese-api');
    assert.equal(antwort.status, 403, `Rolle ${rolle}`);
    assert.equal(antwort.body.fehler, 'Dieses Konto hat hierfür keine Berechtigung.');
  }

  const admin = await angemeldeterAgent(app, db, 'admin');
  const antwort = await admin.get('/api/audit?benutzer=lese-api');
  assert.equal(antwort.status, 200);
  assert.equal(antwort.body.gesamt, 1);
  assert.equal(antwort.body.eintraege[0].benutzername, 'lese-api');
});

test('API: ungültiger Filter liefert 400 mit deutschem Satz', async () => {
  const { app, db } = frischeApp();
  const admin = await angemeldeterAgent(app, db, 'admin');
  const antwort = await admin.get('/api/audit?von=morgen');
  assert.equal(antwort.status, 400);
  assert.match(antwort.body.fehler, /Datum/);
});

test('API: Benutzerliste fürs Dropdown, nur für den Admin', async () => {
  const { app, db } = frischeApp();
  eintragAnlegen(db, { zeitpunkt: '2026-09-01T10:00:00+02:00', benutzername: 'dropdown-bernd' });
  eintragAnlegen(db, { zeitpunkt: '2026-09-01T10:00:00+02:00', benutzername: 'dropdown-anna' });

  const kasse = await angemeldeterAgent(app, db, 'kasse');
  assert.equal((await kasse.get('/api/audit/benutzer')).status, 403);

  const admin = await angemeldeterAgent(app, db, 'admin');
  const antwort = await admin.get('/api/audit/benutzer');
  assert.equal(antwort.status, 200);
  assert.ok(antwort.body.includes('dropdown-anna'));
  assert.ok(antwort.body.includes('dropdown-bernd'));
  assert.ok(antwort.body.indexOf('dropdown-anna') < antwort.body.indexOf('dropdown-bernd'));
});

test('API: es gibt keine Schreib-Endpunkte für das Log', async () => {
  const { app, db } = frischeApp();
  const admin = await angemeldeterAgent(app, db, 'admin');
  for (const methode of ['post', 'put', 'delete', 'patch']) {
    const antwort = await admin[methode]('/api/audit').send({});
    assert.equal(antwort.status, 404, methode);
  }
});
