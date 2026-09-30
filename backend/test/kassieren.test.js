import test from 'node:test';
import assert from 'node:assert/strict';
import { frischeApp, angemeldeterAgent } from './helfer.js';

test('Kassieren vergibt Nummern pro Artikel aufsteigend und friert Werte ein', async () => {
  const { app, db } = frischeApp();
  const admin = await angemeldeterAgent(app, db, 'admin');
  const mayo = (await admin.post('/api/beilagen').send({ name: 'Mayo', name_tr: 'Mayonez' })).body;
  const pommes = (await admin.post('/api/artikel').send({
    name: 'Pommes', name_tr: 'Patates', farbe: '#f5c211', preis_cent: 350,
    beilagen_ids: [mayo.id], sortierung: 1,
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
  assert.deepEqual(ergebnis.kaertchen[0].artikel_name_tr, 'Patates');
  assert.deepEqual(ergebnis.kaertchen[0].beilagen_tr, ['Mayonez']);
  assert.deepEqual(ergebnis.kaertchen[2].artikel_name_tr, null);

  const gespeichertTr = db.prepare(
    'SELECT artikel_name_tr, beilagen_tr FROM kaertchen WHERE id = ?'
  ).get(ergebnis.kaertchen[0].id);
  assert.equal(gespeichertTr.artikel_name_tr, 'Patates');
  assert.deepEqual(JSON.parse(gespeichertTr.beilagen_tr), ['Mayonez']);

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
  const mayo = (await admin.post('/api/beilagen').send({ name: 'Mayo', name_tr: 'Mayonez' })).body;
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
  const beilagenTr = liste[0].beilagen.map((b) => b.name_tr);
  assert.deepEqual(beilagenTr.sort(), ['Mayonez', null]);
});

test('Kassen-Artikelliste enthält keine Einkaufskosten, aber alle Felder für die Kasse', async () => {
  const { app, db } = frischeApp();
  const admin = await angemeldeterAgent(app, db, 'admin');
  const mayo = (await admin.post('/api/beilagen').send({ name: 'Mayo', name_tr: 'Mayonez' })).body;
  const pommes = (await admin.post('/api/artikel').send({
    name: 'Pommes', farbe: '#f5c211', preis_cent: 350, einkaufskosten_cent: 100,
    beilagen_ids: [mayo.id],
  })).body;
  assert.equal(pommes.einkaufskosten_cent, 100);

  const kasse = await angemeldeterAgent(app, db, 'kasse');
  const antwort = await kasse.get('/api/kasse/artikel');
  assert.equal(antwort.status, 200);
  const artikel = antwort.body[0];

  assert.equal('einkaufskosten_cent' in artikel, false);
  assert.equal(artikel.id, pommes.id);
  assert.equal(artikel.name, 'Pommes');
  assert.equal(artikel.preis_cent, 350);
  assert.equal(artikel.farbe, '#f5c211');
  assert.equal(artikel.bild_url, null);
  assert.deepEqual(artikel.beilagen.map((b) => b.name), ['Mayo']);
});

test('Leerer Warenkorb wird abgelehnt', async () => {
  const { app, db } = frischeApp();
  const kasse = await angemeldeterAgent(app, db, 'kasse');
  const antwort = await kasse.post('/api/kasse/kassieren').send({ positionen: [] });
  assert.equal(antwort.status, 400);
});

test('Kärtchen werden bei gleicher Sortierung groß-/kleinschreibungsunabhängig alphabetisch sortiert', async () => {
  const { app, db } = frischeApp();
  const admin = await angemeldeterAgent(app, db, 'admin');
  for (const name of ['Test2', 'cola artikel', 'Burger']) {
    await admin.post('/api/artikel').send({ name, farbe: '#2255cc', preis_cent: 100, beilagen_ids: [] });
  }

  const kasse = await angemeldeterAgent(app, db, 'kasse');
  const liste = (await kasse.get('/api/kasse/artikel')).body;
  assert.deepEqual(liste.map((a) => a.name), ['Burger', 'cola artikel', 'Test2']);
});
