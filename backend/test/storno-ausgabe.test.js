import test from 'node:test';
import assert from 'node:assert/strict';
import { frischeApp, angemeldeterAgent } from './helfer.js';

async function verkaufteBestellung(admin, kasse, name = 'Pommes', preis = 350) {
  const artikel = (await admin.post('/api/artikel').send({
    name, farbe: '#f5c211', preis_cent: preis, beilagen_ids: [], sortierung: 1,
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
  const ausgabe = await angemeldeterAgent(app, db, 'ausgabe');
  const { artikel, kaertchen } = await verkaufteBestellung(admin, kasse);

  const stornierbar = (await kasse.get('/api/kasse/stornierbar')).body;
  assert.equal(stornierbar.length, 1);

  const antwort = await kasse.post(`/api/kasse/storno/${kaertchen.id}`);
  assert.equal(antwort.status, 200);
  const zeile = db.prepare('SELECT * FROM kaertchen WHERE id = ?').get(kaertchen.id);
  assert.equal(zeile.status, 'storniert');
  assert.ok(zeile.storniert_am);
  assert.ok(zeile.storniert_von);

  const listen = (await ausgabe.get('/api/ausgabe/kaertchen')).body;
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
  const ausgabe = await angemeldeterAgent(app, db, 'ausgabe');
  const { kaertchen } = await verkaufteBestellung(admin, kasse);

  await ausgabe.post(`/api/ausgabe/status/${kaertchen.id}`).send({ status: 'abholbereit' });
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
  const ausgabe = await angemeldeterAgent(app, db, 'ausgabe');
  const { kaertchen } = await verkaufteBestellung(admin, kasse);

  const sprung = await ausgabe.post(`/api/ausgabe/status/${kaertchen.id}`).send({ status: 'abgeholt' });
  assert.equal(sprung.status, 409);

  assert.equal((await ausgabe.post(`/api/ausgabe/status/${kaertchen.id}`).send({ status: 'abholbereit' })).status, 200);
  let zeile = db.prepare('SELECT * FROM kaertchen WHERE id = ?').get(kaertchen.id);
  assert.ok(zeile.abholbereit_am);

  assert.equal((await ausgabe.post(`/api/ausgabe/status/${kaertchen.id}`).send({ status: 'abgeholt' })).status, 200);
  zeile = db.prepare('SELECT * FROM kaertchen WHERE id = ?').get(kaertchen.id);
  assert.ok(zeile.abgeholt_am);

  assert.equal((await ausgabe.post(`/api/ausgabe/status/${kaertchen.id}`).send({ status: 'abholbereit' })).status, 200);
  assert.equal((await ausgabe.post(`/api/ausgabe/status/${kaertchen.id}`).send({ status: 'in_bearbeitung' })).status, 200);

  await kasse.post(`/api/kasse/storno/${kaertchen.id}`);
  const nachStorno = await ausgabe.post(`/api/ausgabe/status/${kaertchen.id}`).send({ status: 'abholbereit' });
  assert.equal(nachStorno.status, 409);
});

test('Ausgabe-Listen: Sortierung und zuletzt abgeholt', async () => {
  const { app, db } = frischeApp();
  const admin = await angemeldeterAgent(app, db, 'admin');
  const kasse = await angemeldeterAgent(app, db, 'kasse');
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

  await ausgabe.post(`/api/ausgabe/status/${erstes.id}`).send({ status: 'abholbereit' });
  await ausgabe.post(`/api/ausgabe/status/${erstes.id}`).send({ status: 'abgeholt' });
  await ausgabe.post(`/api/ausgabe/status/${zweites.id}`).send({ status: 'abholbereit' });

  const listen = (await ausgabe.get('/api/ausgabe/kaertchen')).body;
  assert.equal(listen.in_bearbeitung.length, 1);
  assert.equal(listen.abholbereit.length, 1);
  assert.equal(listen.abholbereit[0].nummer, 2);
  assert.equal(listen.zuletzt_abgeholt.length, 1);
  assert.equal(listen.zuletzt_abgeholt[0].nummer, 1);
});

test('Beilagen-Übersicht zeigt nur aktive Beilagen aktiver Artikel', async () => {
  const { app, db } = frischeApp();
  const admin = await angemeldeterAgent(app, db, 'admin');
  const ausgabe = await angemeldeterAgent(app, db, 'ausgabe');
  const mayo = (await admin.post('/api/beilagen').send({ name: 'Mayo' })).body;
  const ketchup = (await admin.post('/api/beilagen').send({ name: 'Ketchup' })).body;
  await admin.put(`/api/beilagen/${ketchup.id}`).send({ name: 'Ketchup', aktiv: 0 });
  await admin.post('/api/artikel').send({
    name: 'Pommes', farbe: '#f5c211', preis_cent: 350,
    beilagen_ids: [mayo.id, ketchup.id], sortierung: 1,
  });

  const uebersicht = (await ausgabe.get('/api/ausgabe/beilagen-uebersicht')).body;
  assert.equal(uebersicht.length, 1);
  assert.equal(uebersicht[0].artikel_name, 'Pommes');
  assert.deepEqual(uebersicht[0].beilagen, ['Mayo']);
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
