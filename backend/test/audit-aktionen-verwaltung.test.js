import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { frischeApp, angemeldeterAgent, auditStand, auditSeit } from './helfer.js';

const GUELTIGES_MINI_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
  'base64'
);

async function artikelAnlegen(agent, daten = {}) {
  return (await agent.post('/api/artikel').send({
    name: 'Pommes', farbe: '#f5c211', preis_cent: 300, beilagen_ids: [], sortierung: 1, ...daten,
  })).body;
}

test('Artikel anlegen wird mit Preis, Kosten, Farbe und Beilagen protokolliert', async () => {
  const { app, db } = frischeApp();
  const admin = await angemeldeterAgent(app, db, 'admin');
  const ketchup = (await admin.post('/api/beilagen').send({ name: 'Ketchup' })).body;
  const stand = auditStand(db);

  await artikelAnlegen(admin, { einkaufskosten_cent: 120, beilagen_ids: [ketchup.id] });

  const eintraege = auditSeit(db, stand);
  assert.equal(eintraege.length, 1);
  assert.equal(eintraege[0].bereich, 'artikel');
  assert.equal(eintraege[0].aktion, 'artikel_angelegt');
  assert.equal(eintraege[0].benutzername, 'test-admin');
  assert.deepEqual(eintraege[0].details.werte, {
    artikel: 'Pommes', preis_cent: 300, einkaufskosten_cent: 120, farbe: '#f5c211', beilagen: ['Ketchup'],
  });
});

test('Artikel ändern: Preis und Name mit vorher/nachher, Rolle des Bearbeiters', async () => {
  const { app, db } = frischeApp();
  const admin = await angemeldeterAgent(app, db, 'admin');
  const verwaltung = await angemeldeterAgent(app, db, 'verwaltung');
  const pommes = await artikelAnlegen(admin);
  const stand = auditStand(db);

  await verwaltung.put(`/api/artikel/${pommes.id}`).send({ ...pommes, name: 'Frites', preis_cent: 350 });

  const eintraege = auditSeit(db, stand);
  assert.equal(eintraege.length, 1);
  assert.equal(eintraege[0].aktion, 'artikel_geaendert');
  assert.equal(eintraege[0].benutzername, 'test-verwaltung');
  assert.equal(eintraege[0].rolle, 'verwaltung');
  assert.deepEqual(eintraege[0].details, {
    werte: { artikel: 'Frites' },
    aenderungen: {
      name: { vorher: 'Pommes', nachher: 'Frites' },
      preis_cent: { vorher: 300, nachher: 350 },
    },
  });
});

test('Artikel speichern ohne Änderung erzeugt keinen Eintrag', async () => {
  const { app, db } = frischeApp();
  const admin = await angemeldeterAgent(app, db, 'admin');
  const pommes = await artikelAnlegen(admin);
  const stand = auditStand(db);

  await admin.put(`/api/artikel/${pommes.id}`).send({ ...pommes });
  assert.equal(auditSeit(db, stand).length, 0);
});

test('Artikel deaktivieren und aktivieren haben eigene Aktionen', async () => {
  const { app, db } = frischeApp();
  const admin = await angemeldeterAgent(app, db, 'admin');
  const pommes = await artikelAnlegen(admin);
  const stand = auditStand(db);

  await admin.put(`/api/artikel/${pommes.id}`).send({ ...pommes, aktiv: 0 });
  await admin.put(`/api/artikel/${pommes.id}`).send({ ...pommes, aktiv: 1 });

  const eintraege = auditSeit(db, stand);
  assert.deepEqual(eintraege.map((e) => e.aktion), ['artikel_deaktiviert', 'artikel_aktiviert']);
  assert.deepEqual(eintraege[0].details.aenderungen, { aktiv: { vorher: 1, nachher: 0 } });
});

test('Artikel ändern: Beilagen und Nummernblöcke werden mit Namen bzw. Bereichen festgehalten', async () => {
  const { app, db } = frischeApp();
  const admin = await angemeldeterAgent(app, db, 'admin');
  const ketchup = (await admin.post('/api/beilagen').send({ name: 'Ketchup' })).body;
  const mayo = (await admin.post('/api/beilagen').send({ name: 'Mayo' })).body;
  const pommes = await artikelAnlegen(admin, { beilagen_ids: [ketchup.id] });
  const stand = auditStand(db);

  await admin.put(`/api/artikel/${pommes.id}`).send({
    ...pommes, beilagen_ids: [ketchup.id, mayo.id], bloecke: [{ von: 1, bis: 50 }, { von: 100, bis: 150 }],
  });

  const aenderungen = auditSeit(db, stand)[0].details.aenderungen;
  assert.deepEqual(aenderungen.beilagen, { vorher: ['Ketchup'], nachher: ['Ketchup', 'Mayo'] });
  assert.deepEqual(aenderungen.bloecke, {
    vorher: ['1-999999999'], nachher: ['1-50', '100-150'],
  });
});

test('Artikel löschen wird einmal protokolliert, ein zweites Löschen nicht mehr', async () => {
  const { app, db } = frischeApp();
  const admin = await angemeldeterAgent(app, db, 'admin');
  const pommes = await artikelAnlegen(admin);
  const stand = auditStand(db);

  await admin.delete(`/api/artikel/${pommes.id}`);
  await admin.delete(`/api/artikel/${pommes.id}`);
  await admin.delete('/api/artikel/99999');

  const eintraege = auditSeit(db, stand);
  assert.equal(eintraege.length, 1);
  assert.equal(eintraege[0].aktion, 'artikel_geloescht');
  assert.deepEqual(eintraege[0].details.werte, { artikel: 'Pommes' });
});

test('Startnummer setzen wird mit vorher/nachher protokolliert, eine Warnung ohne Bestätigung nicht', async () => {
  const { app, db } = frischeApp();
  const admin = await angemeldeterAgent(app, db, 'admin');
  const kasse = await angemeldeterAgent(app, db, 'kasse');
  const pommes = await artikelAnlegen(admin);
  await kasse.post('/api/kasse/kassieren').send({ positionen: [{ artikel_id: pommes.id, beilagen_ids: [] }] });
  const stand = auditStand(db);

  const warnung = await admin.post(`/api/artikel/${pommes.id}/startnummer`).send({ naechste_nummer: 1 });
  assert.equal(warnung.status, 409);
  assert.equal(auditSeit(db, stand).length, 0);

  await admin.post(`/api/artikel/${pommes.id}/startnummer`).send({ naechste_nummer: 1, warnung_bestaetigt: true });
  await admin.post(`/api/artikel/${pommes.id}/startnummer`).send({ naechste_nummer: 500 });

  const eintraege = auditSeit(db, stand);
  assert.equal(eintraege.length, 2);
  assert.equal(eintraege[0].aktion, 'startnummer_gesetzt');
  assert.deepEqual(eintraege[0].details, {
    werte: { artikel: 'Pommes', warnung_bestaetigt: 1 },
    aenderungen: { naechste_nummer: { vorher: 2, nachher: 1 } },
  });
  assert.deepEqual(eintraege[1].details.aenderungen.naechste_nummer, { vorher: 1, nachher: 500 });
});

test('Artikelbild setzen und entfernen', async () => {
  const { app, db } = frischeApp();
  const admin = await angemeldeterAgent(app, db, 'admin');
  const pommes = await artikelAnlegen(admin);
  const stand = auditStand(db);

  await admin.post(`/api/artikel/${pommes.id}/bild`).attach('bild', GUELTIGES_MINI_PNG, 'a.png');
  await admin.delete(`/api/artikel/${pommes.id}/bild`);

  const eintraege = auditSeit(db, stand);
  assert.deepEqual(eintraege.map((e) => e.aktion), ['artikel_bild_gesetzt', 'artikel_bild_entfernt']);
  assert.deepEqual(eintraege[0].details.werte, { artikel: 'Pommes' });
});

test('Beilagen: anlegen, ändern, deaktivieren, löschen', async () => {
  const { app, db } = frischeApp();
  const verwaltung = await angemeldeterAgent(app, db, 'verwaltung');
  const stand = auditStand(db);

  const beilage = (await verwaltung.post('/api/beilagen').send({ name: 'Zwiebeln', name_tr: 'Soğan' })).body;
  await verwaltung.put(`/api/beilagen/${beilage.id}`).send({ name: 'Rote Zwiebeln', aktiv: 1 });
  await verwaltung.put(`/api/beilagen/${beilage.id}`).send({ name: 'Rote Zwiebeln', aktiv: 0 });
  await verwaltung.put(`/api/beilagen/${beilage.id}`).send({ name: 'Rote Zwiebeln', aktiv: 0 });
  await verwaltung.delete(`/api/beilagen/${beilage.id}`);
  await verwaltung.delete(`/api/beilagen/${beilage.id}`);

  const eintraege = auditSeit(db, stand);
  assert.deepEqual(eintraege.map((e) => e.aktion), [
    'beilage_angelegt', 'beilage_geaendert', 'beilage_deaktiviert', 'beilage_geloescht',
  ]);
  assert.deepEqual(eintraege[0].details.werte, { beilage: 'Zwiebeln', name_tr: 'Soğan' });
  assert.deepEqual(eintraege[1].details, {
    werte: { beilage: 'Rote Zwiebeln' },
    aenderungen: { name: { vorher: 'Zwiebeln', nachher: 'Rote Zwiebeln' } },
  });
  assert.ok(eintraege.every((e) => e.rolle === 'verwaltung' && e.bereich === 'artikel'));
});

test('Benutzer anlegen, Passwort ändern und löschen, ohne Passwort im Log', async () => {
  const { app, db } = frischeApp();
  const admin = await angemeldeterAgent(app, db, 'admin');
  const stand = auditStand(db);

  const konto = (await admin.post('/api/benutzer')
    .send({ benutzername: 'anna', passwort: 'GEHEIM-ANLEGEN-1', rolle: 'kasse' })).body;
  await admin.post(`/api/benutzer/${konto.id}/passwort`).send({ passwort: 'GEHEIM-NEU-2222' });
  await admin.delete(`/api/benutzer/${konto.id}`);

  const eintraege = auditSeit(db, stand);
  assert.deepEqual(eintraege.map((e) => e.aktion), ['benutzer_angelegt', 'passwort_geaendert', 'benutzer_geloescht']);
  assert.ok(eintraege.every((e) => e.bereich === 'benutzer' && e.benutzername === 'test-admin'));
  assert.deepEqual(eintraege[0].details.werte, { konto: 'anna', rolle: 'kasse' });
  assert.deepEqual(eintraege[1].details.werte, { konto: 'anna' });
  assert.deepEqual(eintraege[2].details.werte, { konto: 'anna', rolle: 'kasse' });

  const alles = JSON.stringify(db.prepare('SELECT * FROM audit_eintrag').all());
  assert.ok(!alles.includes('GEHEIM-'));
  assert.ok(!alles.includes('$2'), 'kein bcrypt-Hash im Log');
});

test('Fehlgeschlagene Benutzeraktionen hinterlassen keinen Eintrag', async () => {
  const { app, db } = frischeApp();
  const admin = await angemeldeterAgent(app, db, 'admin');
  const stand = auditStand(db);

  await admin.post('/api/benutzer').send({ benutzername: 'x', passwort: 'kurz', rolle: 'kasse' });
  await admin.post('/api/benutzer/99999/passwort').send({ passwort: 'lang-genug-1' });
  await admin.delete('/api/benutzer/99999');
  const eigenesKonto = db.prepare("SELECT id FROM benutzer WHERE benutzername = 'test-admin'").get();
  assert.equal((await admin.delete(`/api/benutzer/${eigenesKonto.id}`)).status, 409);

  assert.equal(auditSeit(db, stand).length, 0);
});

test('Ein Eintrag bleibt lesbar, auch wenn das Konto danach umbenannt und gelöscht wird', async () => {
  const { app, db } = frischeApp();
  const admin = await angemeldeterAgent(app, db, 'admin');
  const konto = (await admin.post('/api/benutzer')
    .send({ benutzername: 'bald-weg', passwort: 'lang-genug-1', rolle: 'kasse' })).body;
  await request(app).post('/api/login').send({ benutzername: 'bald-weg', passwort: 'lang-genug-1' });

  const loginEintrag = db.prepare(
    "SELECT * FROM audit_eintrag WHERE aktion = 'login' AND benutzername = 'bald-weg'"
  ).get();
  assert.ok(loginEintrag, 'Login-Eintrag mit dem ursprünglichen Namen wurde geschrieben');

  db.prepare("UPDATE benutzer SET benutzername = 'bald-weg-2' WHERE id = ?").run(konto.id);
  await admin.delete(`/api/benutzer/${konto.id}`);

  const nachDemLoeschen = db.prepare('SELECT * FROM audit_eintrag WHERE id = ?').get(loginEintrag.id);
  assert.equal(nachDemLoeschen.benutzername, 'bald-weg');
  assert.equal(nachDemLoeschen.rolle, 'kasse');
});

test('Einstellungen: nur tatsächliche Änderungen werden protokolliert', async () => {
  const { app, db } = frischeApp();
  const admin = await angemeldeterAgent(app, db, 'admin');
  db.prepare("UPDATE einstellung SET wert = '15' WHERE schluessel = 'abholbereit_warnminuten'").run();
  const stand = auditStand(db);

  await admin.put('/api/einstellungen').send({ abholbereit_warnminuten: 15 });
  assert.equal(auditSeit(db, stand).length, 0);

  await admin.put('/api/einstellungen').send({ abholbereit_warnminuten: 20, inaktivitaets_abmeldung_minuten: 45 });

  const eintraege = auditSeit(db, stand);
  assert.equal(eintraege.length, 1);
  assert.equal(eintraege[0].bereich, 'einstellungen');
  assert.equal(eintraege[0].aktion, 'einstellungen_geaendert');
  assert.deepEqual(eintraege[0].details.aenderungen.abholbereit_warnminuten, { vorher: 15, nachher: 20 });
  assert.equal(eintraege[0].details.aenderungen.inaktivitaets_abmeldung_minuten.nachher, 45);
});

test('Einstellungen: ungültiger Wert ändert nichts und hinterlässt keinen Eintrag', async () => {
  const { app, db } = frischeApp();
  const admin = await angemeldeterAgent(app, db, 'admin');
  const stand = auditStand(db);
  const antwort = await admin.put('/api/einstellungen')
    .send({ abholbereit_warnminuten: 30, inaktivitaets_abmeldung_minuten: 0 });
  assert.equal(antwort.status, 400);
  assert.equal(auditSeit(db, stand).length, 0);
  assert.notEqual(db.prepare("SELECT wert FROM einstellung WHERE schluessel = 'abholbereit_warnminuten'").get().wert, '30');
});

test('Werbebilder: hinzufügen, deaktivieren, aktivieren, entfernen', async () => {
  const { app, db } = frischeApp();
  const verwaltung = await angemeldeterAgent(app, db, 'verwaltung');
  const stand = auditStand(db);

  const bild = (await verwaltung.post('/api/werbung').attach('bild', GUELTIGES_MINI_PNG, 'w.png')).body;
  await verwaltung.put(`/api/werbung/${bild.id}`).send({ aktiv: 0 });
  await verwaltung.put(`/api/werbung/${bild.id}`).send({ aktiv: 1 });
  await verwaltung.delete(`/api/werbung/${bild.id}`);

  const eintraege = auditSeit(db, stand);
  assert.deepEqual(eintraege.map((e) => e.aktion), [
    'werbebild_hinzugefuegt', 'werbebild_deaktiviert', 'werbebild_aktiviert', 'werbebild_entfernt',
  ]);
  assert.ok(eintraege.every((e) => e.bereich === 'bilder' && e.rolle === 'verwaltung'));
  assert.equal(eintraege[0].details.werte.datei, bild.dateiname);
});

test('Logo: hochladen, deaktivieren, aktivieren, entfernen', async () => {
  const { app, db } = frischeApp();
  const admin = await angemeldeterAgent(app, db, 'admin');
  const stand = auditStand(db);

  const logo = (await admin.post('/api/logo').attach('logo', GUELTIGES_MINI_PNG, 'l.png')).body;
  await admin.put(`/api/logo/${logo.id}`).send({ aktiv: false });
  await admin.put(`/api/logo/${logo.id}`).send({ aktiv: true });
  await admin.delete(`/api/logo/${logo.id}`);

  const eintraege = auditSeit(db, stand);
  assert.deepEqual(eintraege.map((e) => e.aktion), [
    'logo_hochgeladen', 'logo_deaktiviert', 'logo_aktiviert', 'logo_entfernt',
  ]);
  assert.ok(eintraege.every((e) => e.bereich === 'bilder'));
});

test('Backup-Download wird protokolliert, ein abgelehntes Einspielen nicht', async () => {
  const { app, db } = frischeApp();
  const admin = await angemeldeterAgent(app, db, 'admin');
  const stand = auditStand(db);

  await admin.get('/api/backup').buffer().parse((res, weiter) => {
    const teile = [];
    res.on('data', (teil) => teile.push(teil));
    res.on('end', () => weiter(null, Buffer.concat(teile)));
  });
  const abgelehnt = await admin.post('/api/backup/einspielen');
  assert.equal(abgelehnt.status, 400);

  const eintraege = auditSeit(db, stand);
  assert.equal(eintraege.length, 1);
  assert.equal(eintraege[0].bereich, 'backup');
  assert.equal(eintraege[0].aktion, 'backup_heruntergeladen');
});
