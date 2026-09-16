import test from 'node:test';
import assert from 'node:assert/strict';
import { frischeApp, angemeldeterAgent } from './helfer.js';

test('Kassieren-Vorschau zeigt dieselben Nummern wie das echte Kassieren, bucht aber nichts', async () => {
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
  const positionen = [
    { artikel_id: pommes.id, beilagen_ids: [mayo.id] },
    { artikel_id: pommes.id, beilagen_ids: [] },
    { artikel_id: adana.id, beilagen_ids: [] },
  ];

  const vorschau = (await kasse.post('/api/kasse/kassieren-vorschau').send({ positionen })).body;
  assert.equal(vorschau.summe_cent, 350 + 350 + 700);
  const vorschauNummern = vorschau.kaertchen.map((k) => [k.artikel_name, k.nummer]);
  assert.deepEqual(vorschauNummern, [['Pommes', 1], ['Pommes', 2], ['Adana', 1]]);
  assert.deepEqual(vorschau.kaertchen[0].beilagen, ['Mayo']);
  assert.deepEqual(vorschau.kaertchen[0].artikel_name_tr, 'Patates');
  assert.deepEqual(vorschau.kaertchen[0].beilagen_tr, ['Mayonez']);

  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM kaertchen').get().n, 0);
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM kassiervorgang').get().n, 0);
  assert.equal(db.prepare('SELECT naechste_nummer FROM artikel WHERE id = ?').get(pommes.id).naechste_nummer, 1);

  const echtesErgebnis = (await kasse.post('/api/kasse/kassieren').send({ positionen })).body;
  const echteNummern = echtesErgebnis.kaertchen.map((k) => [k.artikel_name, k.nummer]);
  assert.deepEqual(echteNummern, vorschauNummern);
});

test('Kassieren-Vorschau mit deaktiviertem Artikel wird abgelehnt, nichts wird gebucht', async () => {
  const { app, db } = frischeApp();
  const admin = await angemeldeterAgent(app, db, 'admin');
  const cola = (await admin.post('/api/artikel').send({
    name: 'Cola', farbe: '#333333', preis_cent: 250, beilagen_ids: [], sortierung: 1,
  })).body;
  await admin.put(`/api/artikel/${cola.id}`).send({ ...cola, aktiv: 0, beilagen_ids: [] });

  const kasse = await angemeldeterAgent(app, db, 'kasse');
  const antwort = await kasse.post('/api/kasse/kassieren-vorschau').send({
    positionen: [{ artikel_id: cola.id, beilagen_ids: [] }],
  });
  assert.equal(antwort.status, 409);
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM kaertchen').get().n, 0);
});

test('Leerer Warenkorb wird auch bei der Kassieren-Vorschau abgelehnt', async () => {
  const { app, db } = frischeApp();
  const kasse = await angemeldeterAgent(app, db, 'kasse');
  const antwort = await kasse.post('/api/kasse/kassieren-vorschau').send({ positionen: [] });
  assert.equal(antwort.status, 400);
});

test('Kassieren lehnt ab, wenn sich die Nummern seit der Vorschau geändert haben', async () => {
  const { app, db } = frischeApp();
  const admin = await angemeldeterAgent(app, db, 'admin');
  const pommes = (await admin.post('/api/artikel').send({
    name: 'Pommes', farbe: '#f5c211', preis_cent: 350, beilagen_ids: [], sortierung: 1,
  })).body;

  const kasse = await angemeldeterAgent(app, db, 'kasse');
  const positionen = [{ artikel_id: pommes.id, beilagen_ids: [] }];
  const vorschau = (await kasse.post('/api/kasse/kassieren-vorschau').send({ positionen })).body;
  const erwarteteNummern = vorschau.kaertchen.map((k) => k.nummer);

  await admin.post(`/api/artikel/${pommes.id}/startnummer`).send({ naechste_nummer: 50, warnung_bestaetigt: true });

  const antwort = await kasse.post('/api/kasse/kassieren').send({
    positionen, erwartete_nummern: erwarteteNummern,
  });
  assert.equal(antwort.status, 409);
  assert.ok(antwort.body.fehler.includes('Kärtchen-Nummern'));
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM kaertchen').get().n, 0);
  assert.equal(db.prepare('SELECT naechste_nummer FROM artikel WHERE id = ?').get(pommes.id).naechste_nummer, 50);
});

test('Kassieren lehnt ab, wenn sich ein Preis seit der Vorschau geändert hat', async () => {
  const { app, db } = frischeApp();
  const admin = await angemeldeterAgent(app, db, 'admin');
  const pommes = (await admin.post('/api/artikel').send({
    name: 'Pommes', farbe: '#f5c211', preis_cent: 350, beilagen_ids: [], sortierung: 1,
  })).body;

  const kasse = await angemeldeterAgent(app, db, 'kasse');
  const positionen = [{ artikel_id: pommes.id, beilagen_ids: [] }];
  const vorschau = (await kasse.post('/api/kasse/kassieren-vorschau').send({ positionen })).body;
  const erwartetePreiseCent = vorschau.kaertchen.map((k) => k.preis_cent);

  await admin.put(`/api/artikel/${pommes.id}`).send({ ...pommes, preis_cent: 400, beilagen_ids: [] });

  const antwort = await kasse.post('/api/kasse/kassieren').send({
    positionen, erwartete_preise_cent: erwartetePreiseCent,
  });
  assert.equal(antwort.status, 409);
  assert.ok(antwort.body.fehler.includes('Preis'));
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM kaertchen').get().n, 0);
});

test('Kassieren ohne erwartete Nummern funktioniert weiterhin uneingeschränkt', async () => {
  const { app, db } = frischeApp();
  const admin = await angemeldeterAgent(app, db, 'admin');
  const pommes = (await admin.post('/api/artikel').send({
    name: 'Pommes', farbe: '#f5c211', preis_cent: 350, beilagen_ids: [], sortierung: 1,
  })).body;

  const kasse = await angemeldeterAgent(app, db, 'kasse');
  const antwort = await kasse.post('/api/kasse/kassieren').send({
    positionen: [{ artikel_id: pommes.id, beilagen_ids: [] }],
  });
  assert.equal(antwort.status, 200);
});
