import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { frischeApp, angemeldeterAgent } from './helfer.js';

async function verkaufteBestellung(admin, kasse, name = 'Pommes', preis = 350, nameTr = null) {
  const artikel = (await admin.post('/api/artikel').send({
    name, name_tr: nameTr, farbe: '#f5c211', preis_cent: preis, beilagen_ids: [], sortierung: 1,
  })).body;
  const ergebnis = (await kasse.post('/api/kasse/kassieren').send({
    positionen: [{ artikel_id: artikel.id, beilagen_ids: [] }],
  })).body;
  return { artikel, kaertchen: ergebnis.kaertchen[0] };
}

test('Storno setzt Status, verschwindet aus Listen, Nummer nicht wiederverwendet', async () => {
  const { app, db } = frischeApp();
  const admin = await angemeldeterAgent(app, db, 'admin');
  const kasse = await angemeldeterAgent(app, db, 'kasse');
  const belegen = await angemeldeterAgent(app, db, 'belegen');
  const { artikel, kaertchen } = await verkaufteBestellung(admin, kasse, 'Pommes', 350, 'Test Türkisch');

  const stornierbar = (await kasse.get('/api/kasse/stornierbar')).body;
  assert.equal(stornierbar.length, 1);
  assert.equal(stornierbar[0].artikel_name_tr, 'Test Türkisch');
  assert.deepEqual(stornierbar[0].beilagen_tr, []);

  const antwort = await kasse.post(`/api/kasse/storno/${kaertchen.id}`);
  assert.equal(antwort.status, 200);
  const zeile = db.prepare('SELECT * FROM kaertchen WHERE id = ?').get(kaertchen.id);
  assert.equal(zeile.status, 'storniert');
  assert.ok(zeile.storniert_am);
  assert.ok(zeile.storniert_von);

  const listen = (await belegen.get('/api/belegen/kaertchen')).body;
  assert.equal(listen.in_bearbeitung.length, 0);
  assert.equal((await kasse.get('/api/kasse/stornierbar')).body.length, 0);

  const weiter = (await kasse.post('/api/kasse/kassieren').send({
    positionen: [{ artikel_id: artikel.id, beilagen_ids: [] }],
  })).body;
  assert.equal(weiter.kaertchen[0].nummer, 2);
});

test('Bereits abgeholtes Kärtchen ist nicht stornierbar', async () => {
  const { app, db } = frischeApp();
  const admin = await angemeldeterAgent(app, db, 'admin');
  const kasse = await angemeldeterAgent(app, db, 'kasse');
  const belegen = await angemeldeterAgent(app, db, 'belegen');
  const ausgabe = await angemeldeterAgent(app, db, 'ausgabe');
  const { kaertchen } = await verkaufteBestellung(admin, kasse);

  await belegen.post(`/api/belegen/status/${kaertchen.id}`).send({ status: 'abholbereit' });
  await ausgabe.post(`/api/ausgabe/status/${kaertchen.id}`).send({ status: 'abgeholt' });

  const antwort = await kasse.post(`/api/kasse/storno/${kaertchen.id}`);
  assert.equal(antwort.status, 409);
  const nochmal = await kasse.post(`/api/kasse/storno/${kaertchen.id}`);
  assert.equal(nochmal.status, 409);
});

test('Statuswechsel-Kette mit Zeitstempeln, Rückgängig und verbotenen Sprüngen', async () => {
  const { app, db } = frischeApp();
  const admin = await angemeldeterAgent(app, db, 'admin');
  const kasse = await angemeldeterAgent(app, db, 'kasse');
  const belegen = await angemeldeterAgent(app, db, 'belegen');
  const ausgabe = await angemeldeterAgent(app, db, 'ausgabe');
  const { kaertchen } = await verkaufteBestellung(admin, kasse);

  const sprung = await ausgabe.post(`/api/ausgabe/status/${kaertchen.id}`).send({ status: 'abgeholt' });
  assert.equal(sprung.status, 409);

  assert.equal((await belegen.post(`/api/belegen/status/${kaertchen.id}`).send({ status: 'abholbereit' })).status, 200);
  let zeile = db.prepare('SELECT * FROM kaertchen WHERE id = ?').get(kaertchen.id);
  assert.ok(zeile.abholbereit_am);

  assert.equal((await ausgabe.post(`/api/ausgabe/status/${kaertchen.id}`).send({ status: 'abgeholt' })).status, 200);
  zeile = db.prepare('SELECT * FROM kaertchen WHERE id = ?').get(kaertchen.id);
  assert.ok(zeile.abgeholt_am);

  assert.equal((await ausgabe.post(`/api/ausgabe/status/${kaertchen.id}`).send({ status: 'abholbereit' })).status, 200);
  assert.equal((await belegen.post(`/api/belegen/status/${kaertchen.id}`).send({ status: 'in_bearbeitung' })).status, 200);

  await kasse.post(`/api/kasse/storno/${kaertchen.id}`);
  const nachStorno = await belegen.post(`/api/belegen/status/${kaertchen.id}`).send({ status: 'abholbereit' });
  assert.equal(nachStorno.status, 409);
});

test('Belegen- und Ausgabe-Rolle sind serverseitig strikt getrennt', async () => {
  const { app, db } = frischeApp();
  const admin = await angemeldeterAgent(app, db, 'admin');
  const kasse = await angemeldeterAgent(app, db, 'kasse');
  const belegen = await angemeldeterAgent(app, db, 'belegen');
  const ausgabe = await angemeldeterAgent(app, db, 'ausgabe');
  const { kaertchen } = await verkaufteBestellung(admin, kasse);

  const belegenAufAusgabe = await belegen.post(`/api/ausgabe/status/${kaertchen.id}`).send({ status: 'abgeholt' });
  assert.equal(belegenAufAusgabe.status, 403);

  await belegen.post(`/api/belegen/status/${kaertchen.id}`).send({ status: 'abholbereit' });

  const ausgabeAufBelegen = await ausgabe.post(`/api/belegen/status/${kaertchen.id}`).send({ status: 'in_bearbeitung' });
  assert.equal(ausgabeAufBelegen.status, 403);

  const ausgabeListenZugriff = await belegen.get('/api/ausgabe/kaertchen');
  assert.equal(ausgabeListenZugriff.status, 403);
  const belegenListenZugriff = await ausgabe.get('/api/belegen/kaertchen');
  assert.equal(belegenListenZugriff.status, 403);
});

test('Ausgabe- und Belegen-Listen: Sortierung und zuletzt abgeholt', async () => {
  const { app, db } = frischeApp();
  const admin = await angemeldeterAgent(app, db, 'admin');
  const kasse = await angemeldeterAgent(app, db, 'kasse');
  const belegen = await angemeldeterAgent(app, db, 'belegen');
  const ausgabe = await angemeldeterAgent(app, db, 'ausgabe');
  const artikel = (await admin.post('/api/artikel').send({
    name: 'Adana', farbe: '#2255cc', preis_cent: 700, beilagen_ids: [], sortierung: 1,
  })).body;
  const ergebnis = (await kasse.post('/api/kasse/kassieren').send({
    positionen: [
      { artikel_id: artikel.id, beilagen_ids: [] },
      { artikel_id: artikel.id, beilagen_ids: [] },
      { artikel_id: artikel.id, beilagen_ids: [] },
    ],
  })).body;
  const [erstes, zweites] = ergebnis.kaertchen;

  await belegen.post(`/api/belegen/status/${erstes.id}`).send({ status: 'abholbereit' });
  await ausgabe.post(`/api/ausgabe/status/${erstes.id}`).send({ status: 'abgeholt' });
  await belegen.post(`/api/belegen/status/${zweites.id}`).send({ status: 'abholbereit' });

  const belegenListen = (await belegen.get('/api/belegen/kaertchen')).body;
  assert.equal(belegenListen.in_bearbeitung.length, 1);

  const ausgabeListen = (await ausgabe.get('/api/ausgabe/kaertchen')).body;
  assert.equal(ausgabeListen.abholbereit.length, 1);
  assert.equal(ausgabeListen.abholbereit[0].nummer, 2);
  assert.equal(ausgabeListen.abholbereit[0].artikel_name_tr, null);
  assert.equal(ausgabeListen.zuletzt_abgeholt.length, 1);
  assert.equal(ausgabeListen.zuletzt_abgeholt[0].nummer, 1);
});

test('TV-Endpunkt ist offen, zeigt nur Nötiges, keine stornierten, nur heutige', async () => {
  const { app, db } = frischeApp();
  const admin = await angemeldeterAgent(app, db, 'admin');
  const kasse = await angemeldeterAgent(app, db, 'kasse');
  const { artikel, kaertchen } = await verkaufteBestellung(admin, kasse);
  const zweites = (await kasse.post('/api/kasse/kassieren').send({
    positionen: [{ artikel_id: artikel.id, beilagen_ids: [] }],
  })).body.kaertchen[0];
  await kasse.post(`/api/kasse/storno/${zweites.id}`);

  db.prepare(
    `INSERT INTO kaertchen (kassiervorgang_id, artikel_id, nummer, artikel_name, artikel_farbe,
       preis_cent, beilagen, status, erstellt_am)
     VALUES (1, ?, 99, 'Alt', '#000000', 100, '[]', 'in_bearbeitung', '2020-01-01T12:00:00')`
  ).run(artikel.id);

  const tv = (await request(app).get('/api/tv/kaertchen')).body;
  assert.equal(tv.in_bearbeitung.length, 1);
  assert.deepEqual(Object.keys(tv.in_bearbeitung[0]).sort(), ['artikel_farbe', 'artikel_name', 'nummer']);
  assert.equal(tv.in_bearbeitung[0].nummer, kaertchen.nummer);
  assert.equal(tv.zuletzt_abgeholt, undefined);
});

test('Startnummer: Warnung bei Kollision, Bestätigung erzwingt, hohe Nummer ohne Warnung', async () => {
  const { app, db } = frischeApp();
  const admin = await angemeldeterAgent(app, db, 'admin');
  const kasse = await angemeldeterAgent(app, db, 'kasse');
  const artikel = (await admin.post('/api/artikel').send({
    name: 'Pommes', farbe: '#f5c211', preis_cent: 350, beilagen_ids: [], sortierung: 1,
  })).body;
  await kasse.post('/api/kasse/kassieren').send({
    positionen: [
      { artikel_id: artikel.id, beilagen_ids: [] },
      { artikel_id: artikel.id, beilagen_ids: [] },
    ],
  });

  const ohneBestaetigung = await admin.post(`/api/artikel/${artikel.id}/startnummer`)
    .send({ naechste_nummer: 1 });
  assert.equal(ohneBestaetigung.status, 409);
  assert.equal(ohneBestaetigung.body.warnung.hoechste_nummer_heute, 2);

  const mitBestaetigung = await admin.post(`/api/artikel/${artikel.id}/startnummer`)
    .send({ naechste_nummer: 1, warnung_bestaetigt: true });
  assert.equal(mitBestaetigung.status, 200);
  const weiter = (await kasse.post('/api/kasse/kassieren').send({
    positionen: [{ artikel_id: artikel.id, beilagen_ids: [] }],
  })).body;
  assert.equal(weiter.kaertchen[0].nummer, 1);

  const hoch = await admin.post(`/api/artikel/${artikel.id}/startnummer`)
    .send({ naechste_nummer: 500 });
  assert.equal(hoch.status, 200);
});

test('Kärtchen von gestern lässt sich nicht stornieren, Statistik des alten Tages bleibt gleich', async () => {
  const { app, db } = frischeApp();
  const admin = await angemeldeterAgent(app, db, 'admin');
  const kasse = await angemeldeterAgent(app, db, 'kasse');
  const belegen = await angemeldeterAgent(app, db, 'belegen');
  const { artikel, kaertchen: erstes } = await verkaufteBestellung(admin, kasse);
  const zweites = (await kasse.post('/api/kasse/kassieren').send({
    positionen: [{ artikel_id: artikel.id, beilagen_ids: [] }],
  })).body.kaertchen[0];
  await belegen.post(`/api/belegen/status/${zweites.id}`).send({ status: 'abholbereit' });
  db.prepare("UPDATE kaertchen SET erstellt_am = '2020-01-01T12:00:00+01:00'").run();

  for (const kaertchen of [erstes, zweites]) {
    const antwort = await kasse.post(`/api/kasse/storno/${kaertchen.id}`);
    assert.equal(antwort.status, 409);
    assert.match(antwort.body.fehler, /heutige/);
    assert.notEqual(db.prepare('SELECT status FROM kaertchen WHERE id = ?').get(kaertchen.id).status, 'storniert');
  }
  const statistik = (await admin.get('/api/statistik/tag/2020-01-01')).body;
  assert.equal(statistik.gesamt.umsatz_cent, 700);
});

test('Startnummer: bereits vergebene, aber stornierte Nummer löst ebenfalls die Warnung aus', async () => {
  const { app, db } = frischeApp();
  const admin = await angemeldeterAgent(app, db, 'admin');
  const kasse = await angemeldeterAgent(app, db, 'kasse');
  const { artikel, kaertchen } = await verkaufteBestellung(admin, kasse);
  await kasse.post(`/api/kasse/storno/${kaertchen.id}`);

  const liste = (await admin.get('/api/artikel')).body;
  assert.equal(liste[0].hoechste_nummer_heute, 1);

  const ohneBestaetigung = await admin.post(`/api/artikel/${artikel.id}/startnummer`)
    .send({ naechste_nummer: 1 });
  assert.equal(ohneBestaetigung.status, 409);
  assert.equal(ohneBestaetigung.body.warnung.hoechste_nummer_heute, 1);

  const mitBestaetigung = await admin.post(`/api/artikel/${artikel.id}/startnummer`)
    .send({ naechste_nummer: 1, warnung_bestaetigt: true });
  assert.equal(mitBestaetigung.status, 200);

  const hoehere = await admin.post(`/api/artikel/${artikel.id}/startnummer`).send({ naechste_nummer: 2 });
  assert.equal(hoehere.status, 200);
});
