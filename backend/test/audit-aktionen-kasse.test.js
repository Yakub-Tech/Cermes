import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { frischeApp, angemeldeterAgent, auditStand, auditSeit } from './helfer.js';

async function artikelAnlegen(admin, daten = {}) {
  return (await admin.post('/api/artikel').send({
    name: 'Pommes', farbe: '#f5c211', preis_cent: 350, beilagen_ids: [], sortierung: 1, ...daten,
  })).body;
}

test('Login und Logout werden mit Name und Rolle protokolliert', async () => {
  const { app, db } = frischeApp();
  const stand = auditStand(db);
  const agent = await angemeldeterAgent(app, db, 'kasse');
  await agent.post('/api/logout');

  const eintraege = auditSeit(db, stand);
  assert.deepEqual(eintraege.map((e) => e.aktion), ['login', 'logout']);
  for (const eintrag of eintraege) {
    assert.equal(eintrag.bereich, 'anmeldung');
    assert.equal(eintrag.benutzername, 'test-kasse');
    assert.equal(eintrag.rolle, 'kasse');
  }
});

test('Logout wegen Inaktivität hat eine eigene Aktion, Logout ohne Anmeldung keinen Eintrag', async () => {
  const { app, db } = frischeApp();
  const agent = await angemeldeterAgent(app, db, 'ausgabe');
  const stand = auditStand(db);

  await agent.post('/api/logout').send({ grund: 'inaktivitaet' });
  await request(app).post('/api/logout');

  const eintraege = auditSeit(db, stand);
  assert.equal(eintraege.length, 1);
  assert.equal(eintraege[0].aktion, 'logout_inaktivitaet');
  assert.equal(eintraege[0].benutzername, 'test-ausgabe');
});

test('Fehlgeschlagener Login: versuchter Name, keine Rolle, kein Passwort', async () => {
  const { app, db } = frischeApp();
  await angemeldeterAgent(app, db, 'kasse');
  const stand = auditStand(db);

  await request(app).post('/api/login').send({ benutzername: 'test-kasse', passwort: 'GEHEIM-FALSCH-1' });
  await request(app).post('/api/login').send({ benutzername: 'gibt-es-nicht', passwort: 'GEHEIM-FALSCH-2' });

  const eintraege = auditSeit(db, stand);
  assert.equal(eintraege.length, 2);
  assert.deepEqual(eintraege.map((e) => e.benutzername), ['test-kasse', 'gibt-es-nicht']);
  for (const eintrag of eintraege) {
    assert.equal(eintrag.aktion, 'login_fehlgeschlagen');
    assert.equal(eintrag.bereich, 'anmeldung');
    assert.equal(eintrag.rolle, null);
    assert.ok(!JSON.stringify(eintrag).includes('GEHEIM-FALSCH'));
  }
});

test('Ein extrem langer versuchter Benutzername wird gekürzt gespeichert', async () => {
  const { app, db } = frischeApp();
  const stand = auditStand(db);
  await request(app).post('/api/login').send({ benutzername: 'x'.repeat(5000), passwort: 'egal' });
  const eintrag = auditSeit(db, stand)[0];
  assert.equal(eintrag.benutzername.length, 100);
});

test('Ersteinrichtung wird protokolliert', async () => {
  const { app, db } = frischeApp();
  const stand = auditStand(db);
  const antwort = await request(app).post('/api/ersteinrichtung')
    .send({ benutzername: 'erster-admin', passwort: 'sehr-geheim-123' });
  assert.equal(antwort.status, 200);

  const eintraege = auditSeit(db, stand);
  assert.equal(eintraege.length, 1);
  assert.equal(eintraege[0].bereich, 'benutzer');
  assert.equal(eintraege[0].aktion, 'ersteinrichtung');
  assert.equal(eintraege[0].benutzername, 'erster-admin');
  assert.equal(eintraege[0].rolle, 'admin');
  assert.ok(!JSON.stringify(eintraege[0]).includes('sehr-geheim-123'));
});

test('Kassieren wird mit Vorgang, Summe und allen Positionen protokolliert', async () => {
  const { app, db } = frischeApp();
  const admin = await angemeldeterAgent(app, db, 'admin');
  const kasse = await angemeldeterAgent(app, db, 'kasse');
  const ketchup = (await admin.post('/api/beilagen').send({ name: 'Ketchup' })).body;
  const pommes = await artikelAnlegen(admin, { beilagen_ids: [ketchup.id] });
  const burger = await artikelAnlegen(admin, { name: 'Burger', preis_cent: 500 });
  const stand = auditStand(db);

  const ergebnis = (await kasse.post('/api/kasse/kassieren').send({
    positionen: [
      { artikel_id: pommes.id, beilagen_ids: [ketchup.id] },
      { artikel_id: burger.id, beilagen_ids: [] },
    ],
  })).body;

  const eintraege = auditSeit(db, stand);
  assert.equal(eintraege.length, 1);
  const eintrag = eintraege[0];
  assert.equal(eintrag.bereich, 'kasse');
  assert.equal(eintrag.aktion, 'kassiert');
  assert.equal(eintrag.benutzername, 'test-kasse');
  assert.equal(eintrag.rolle, 'kasse');
  assert.deepEqual(eintrag.details, {
    werte: {
      kassiervorgang: ergebnis.kassiervorgang_id,
      summe_cent: 850,
      positionen: [
        { nummer: 1, artikel_name: 'Pommes', beilagen: ['Ketchup'], preis_cent: 350 },
        { nummer: 1, artikel_name: 'Burger', beilagen: [], preis_cent: 500 },
      ],
    },
  });
});

test('Abgelehntes Kassieren hinterlässt keinen Eintrag', async () => {
  const { app, db } = frischeApp();
  const admin = await angemeldeterAgent(app, db, 'admin');
  const kasse = await angemeldeterAgent(app, db, 'kasse');
  const pommes = await artikelAnlegen(admin);
  await admin.put(`/api/artikel/${pommes.id}`).send({ ...pommes, aktiv: 0 });
  const stand = auditStand(db);

  const antwort = await kasse.post('/api/kasse/kassieren').send({
    positionen: [{ artikel_id: pommes.id, beilagen_ids: [] }],
  });
  assert.equal(antwort.status, 409);
  assert.equal(auditSeit(db, stand).length, 0);
});

test('Storno wird mit Nummer, Artikel, Betrag und Statuswechsel protokolliert', async () => {
  const { app, db } = frischeApp();
  const admin = await angemeldeterAgent(app, db, 'admin');
  const kasse = await angemeldeterAgent(app, db, 'kasse');
  const pommes = await artikelAnlegen(admin);
  const kaertchen = (await kasse.post('/api/kasse/kassieren').send({
    positionen: [{ artikel_id: pommes.id, beilagen_ids: [] }],
  })).body.kaertchen[0];
  const stand = auditStand(db);

  assert.equal((await kasse.post(`/api/kasse/storno/${kaertchen.id}`)).status, 200);
  assert.equal((await kasse.post(`/api/kasse/storno/${kaertchen.id}`)).status, 409);

  const eintraege = auditSeit(db, stand);
  assert.equal(eintraege.length, 1);
  assert.equal(eintraege[0].bereich, 'storno');
  assert.equal(eintraege[0].aktion, 'storniert');
  assert.equal(eintraege[0].benutzername, 'test-kasse');
  assert.deepEqual(eintraege[0].details, {
    werte: { nummer: 1, artikel: 'Pommes', preis_cent: 350, beilagen: [] },
    aenderungen: { status: { vorher: 'in_bearbeitung', nachher: 'storniert' } },
  });
});

test('Statuswechsel in Belegen und Ausgabe werden mit Benutzer protokolliert', async () => {
  const { app, db } = frischeApp();
  const admin = await angemeldeterAgent(app, db, 'admin');
  const kasse = await angemeldeterAgent(app, db, 'kasse');
  const belegen = await angemeldeterAgent(app, db, 'belegen');
  const ausgabe = await angemeldeterAgent(app, db, 'ausgabe');
  const pommes = await artikelAnlegen(admin);
  const kaertchen = (await kasse.post('/api/kasse/kassieren').send({
    positionen: [{ artikel_id: pommes.id, beilagen_ids: [] }],
  })).body.kaertchen[0];
  const stand = auditStand(db);

  await belegen.post(`/api/belegen/status/${kaertchen.id}`).send({ status: 'abholbereit' });
  await ausgabe.post(`/api/ausgabe/status/${kaertchen.id}`).send({ status: 'abgeholt' });
  await ausgabe.post(`/api/ausgabe/status/${kaertchen.id}`).send({ status: 'abholbereit' });

  const eintraege = auditSeit(db, stand);
  assert.equal(eintraege.length, 3);
  for (const eintrag of eintraege) {
    assert.equal(eintrag.bereich, 'ausgabe');
    assert.equal(eintrag.aktion, 'kaertchen_status_geaendert');
    assert.deepEqual(eintrag.details.werte, { nummer: 1, artikel: 'Pommes' });
  }
  assert.deepEqual(eintraege.map((e) => [e.benutzername, e.details.aenderungen.status]), [
    ['test-belegen', { vorher: 'in_bearbeitung', nachher: 'abholbereit' }],
    ['test-ausgabe', { vorher: 'abholbereit', nachher: 'abgeholt' }],
    ['test-ausgabe', { vorher: 'abgeholt', nachher: 'abholbereit' }],
  ]);
});

test('Verbotener Statuswechsel hinterlässt keinen Eintrag', async () => {
  const { app, db } = frischeApp();
  const admin = await angemeldeterAgent(app, db, 'admin');
  const kasse = await angemeldeterAgent(app, db, 'kasse');
  const ausgabe = await angemeldeterAgent(app, db, 'ausgabe');
  const pommes = await artikelAnlegen(admin);
  const kaertchen = (await kasse.post('/api/kasse/kassieren').send({
    positionen: [{ artikel_id: pommes.id, beilagen_ids: [] }],
  })).body.kaertchen[0];
  const stand = auditStand(db);

  const antwort = await ausgabe.post(`/api/ausgabe/status/${kaertchen.id}`).send({ status: 'abgeholt' });
  assert.equal(antwort.status, 409);
  assert.equal(auditSeit(db, stand).length, 0);
});

test('Schlägt das Schreiben des Eintrags fehl, wird auch die Aktion zurückgerollt', async () => {
  const { app, db } = frischeApp();
  const admin = await angemeldeterAgent(app, db, 'admin');
  const kasse = await angemeldeterAgent(app, db, 'kasse');
  const pommes = await artikelAnlegen(admin);
  const kaertchen = (await kasse.post('/api/kasse/kassieren').send({
    positionen: [{ artikel_id: pommes.id, beilagen_ids: [] }],
  })).body.kaertchen[0];

  db.exec(`CREATE TRIGGER test_audit_defekt BEFORE INSERT ON audit_eintrag
           BEGIN SELECT RAISE(ABORT, 'Testfehler'); END;`);
  try {
    const vorgaenge = db.prepare('SELECT COUNT(*) AS n FROM kassiervorgang').get().n;
    const kassiert = await kasse.post('/api/kasse/kassieren').send({
      positionen: [{ artikel_id: pommes.id, beilagen_ids: [] }],
    });
    assert.equal(kassiert.status, 500);
    assert.equal(kassiert.body.fehler, 'Es ist ein unerwarteter Fehler aufgetreten. Bitte noch einmal versuchen.');
    assert.equal(db.prepare('SELECT COUNT(*) AS n FROM kassiervorgang').get().n, vorgaenge);
    assert.equal(db.prepare('SELECT naechste_nummer FROM artikel WHERE id = ?').get(pommes.id).naechste_nummer, 2);

    const storno = await kasse.post(`/api/kasse/storno/${kaertchen.id}`);
    assert.equal(storno.status, 500);
    assert.equal(db.prepare('SELECT status FROM kaertchen WHERE id = ?').get(kaertchen.id).status, 'in_bearbeitung');

    const preis = await admin.put(`/api/artikel/${pommes.id}`).send({ ...pommes, preis_cent: 999 });
    assert.equal(preis.status, 500);
    assert.equal(db.prepare('SELECT preis_cent FROM artikel WHERE id = ?').get(pommes.id).preis_cent, 350);

    const konto = await admin.post('/api/benutzer').send({ benutzername: 'neu', passwort: 'geheim-1234', rolle: 'kasse' });
    assert.equal(konto.status, 500);
    assert.equal(db.prepare("SELECT COUNT(*) AS n FROM benutzer WHERE benutzername = 'neu'").get().n, 0);
  } finally {
    db.exec('DROP TRIGGER test_audit_defekt');
  }
});
