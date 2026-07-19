import test from 'node:test';
import assert from 'node:assert/strict';
import { frischeApp, angemeldeterAgent } from './helfer.js';

test('Kassieren vergibt Nummern pro Artikel aufsteigend und friert Werte ein', async () => {
  const { app, db } = frischeApp();
  const admin = await angemeldeterAgent(app, db, 'admin');
  const mayo = (await admin.post('/api/beilagen').send({ name: 'Mayo' })).body;
  const pommes = (await admin.post('/api/artikel').send({
    name: 'Pommes', farbe: '#f5c211', preis_cent: 350, beilagen_ids: [mayo.id], sortierung: 1,
  })).body;
  const adana = (await admin.post('/api/artikel').send({
    name: 'Adana', farbe: '#2255cc', preis_cent: 700, beilagen_ids: [], sortierung: 2,
  })).body;

  const kasse = await angemeldeterAgent(app, db, 'kasse');
  const ergebnis = (await kasse.post('/api/kasse/kassieren').send({
    positionen: [
      { artikel_id: pommes.id, beilagen_ids: [mayo.id] },
      { artikel_id: pommes.id, beilagen_ids: [] },
      { artikel_id: adana.id, beilagen_ids: [] },
    ],
  })).body;

  assert.equal(ergebnis.summe_cent, 350 + 350 + 700);
  const nummern = ergebnis.kaertchen.map((k) => [k.artikel_name, k.nummer]);
  assert.deepEqual(nummern, [['Pommes', 1], ['Pommes', 2], ['Adana', 1]]);
  assert.deepEqual(ergebnis.kaertchen[0].beilagen, ['Mayo']);

  await admin.put(`/api/artikel/${pommes.id}`).send({ ...pommes, preis_cent: 999, aktiv: 1, beilagen_ids: [mayo.id] });
  const gespeichert = db.prepare('SELECT preis_cent FROM kaertchen WHERE id = ?').get(ergebnis.kaertchen[0].id);
  assert.equal(gespeichert.preis_cent, 350);
});

test('Kassieren mit deaktiviertem Artikel wird abgelehnt, nichts wird gebucht', async () => {
  const { app, db } = frischeApp();
  const admin = await angemeldeterAgent(app, db, 'admin');
  const cola = (await admin.post('/api/artikel').send({
    name: 'Cola', farbe: '#333333', preis_cent: 250, beilagen_ids: [], sortierung: 1,
  })).body;
  const burger = (await admin.post('/api/artikel').send({
    name: 'Burger', farbe: '#994400', preis_cent: 600, beilagen_ids: [], sortierung: 2,
  })).body;
  await admin.put(`/api/artikel/${cola.id}`).send({ ...cola, aktiv: 0, beilagen_ids: [] });

  const kasse = await angemeldeterAgent(app, db, 'kasse');
  const antwort = await kasse.post('/api/kasse/kassieren').send({
    positionen: [
      { artikel_id: burger.id, beilagen_ids: [] },
      { artikel_id: cola.id, beilagen_ids: [] },
    ],
  });
  assert.equal(antwort.status, 409);
  assert.ok(antwort.body.fehler.length > 0);
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM kaertchen').get().n, 0);
  assert.equal(db.prepare('SELECT naechste_nummer FROM artikel WHERE id = ?').get(burger.id).naechste_nummer, 1);
});

test('Kassieren mit inaktiver Beilage wird mit Klartext abgelehnt', async () => {
  const { app, db } = frischeApp();
  const admin = await angemeldeterAgent(app, db, 'admin');
  const zwiebeln = (await admin.post('/api/beilagen').send({ name: 'Zwiebeln' })).body;
  const burger = (await admin.post('/api/artikel').send({
    name: 'Burger', farbe: '#994400', preis_cent: 600, beilagen_ids: [zwiebeln.id], sortierung: 1,
  })).body;
  await admin.put(`/api/beilagen/${zwiebeln.id}`).send({ name: 'Zwiebeln', aktiv: 0 });

  const kasse = await angemeldeterAgent(app, db, 'kasse');
  const antwort = await kasse.post('/api/kasse/kassieren').send({
    positionen: [{ artikel_id: burger.id, beilagen_ids: [zwiebeln.id] }],
  });
  assert.equal(antwort.status, 409);
  assert.ok(antwort.body.fehler.includes('Burger'));
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM kaertchen').get().n, 0);
});

test('Kassen-Artikelliste zeigt nur aktive Artikel mit allen Beilagen', async () => {
  const { app, db } = frischeApp();
  const admin = await angemeldeterAgent(app, db, 'admin');
  const mayo = (await admin.post('/api/beilagen').send({ name: 'Mayo' })).body;
  const ketchup = (await admin.post('/api/beilagen').send({ name: 'Ketchup' })).body;
  await admin.put(`/api/beilagen/${ketchup.id}`).send({ name: 'Ketchup', aktiv: 0 });
  await admin.post('/api/artikel').send({
    name: 'Pommes', farbe: '#f5c211', preis_cent: 350,
    beilagen_ids: [mayo.id, ketchup.id], sortierung: 2,
  });
  const versteckt = (await admin.post('/api/artikel').send({
    name: 'Versteckt', farbe: '#000000', preis_cent: 100, beilagen_ids: [], sortierung: 1,
  })).body;
  await admin.put(`/api/artikel/${versteckt.id}`).send({ ...versteckt, aktiv: 0, beilagen_ids: [] });

  const kasse = await angemeldeterAgent(app, db, 'kasse');
  const liste = (await kasse.get('/api/kasse/artikel')).body;
  assert.equal(liste.length, 1);
  assert.equal(liste[0].name, 'Pommes');
  const beilagenNamen = liste[0].beilagen.map((b) => [b.name, b.aktiv]);
  assert.deepEqual(beilagenNamen.sort(), [['Ketchup', 0], ['Mayo', 1]]);
});

test('Leerer Warenkorb wird abgelehnt', async () => {
  const { app, db } = frischeApp();
  const kasse = await angemeldeterAgent(app, db, 'kasse');
  const antwort = await kasse.post('/api/kasse/kassieren').send({ positionen: [] });
  assert.equal(antwort.status, 400);
});
