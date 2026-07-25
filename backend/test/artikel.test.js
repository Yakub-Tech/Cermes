import test from 'node:test';
import assert from 'node:assert/strict';
import { frischeApp, angemeldeterAgent } from './helfer.js';

test('Artikel anlegen, zuordnen, deaktivieren, löschen', async () => {
  const { app, db } = frischeApp();
  const admin = await angemeldeterAgent(app, db, 'admin');
  const ketchup = (await admin.post('/api/beilagen').send({ name: 'Ketchup' })).body;
  const pommes = (await admin.post('/api/artikel').send({
    name: 'Pommes', farbe: '#f5c211', preis_cent: 350,
    einkaufskosten_cent: 120, sortierung: 1, beilagen_ids: [ketchup.id],
  })).body;
  assert.equal(pommes.naechste_nummer, 1);

  let liste = (await admin.get('/api/artikel')).body;
  assert.deepEqual(liste[0].beilagen_ids, [ketchup.id]);
  assert.equal(liste[0].hoechste_nummer_heute, null);

  await admin.put(`/api/artikel/${pommes.id}`).send({ ...pommes, aktiv: 0, beilagen_ids: [] });
  liste = (await admin.get('/api/artikel')).body;
  assert.equal(liste[0].aktiv, 0);
  assert.deepEqual(liste[0].beilagen_ids, []);

  await admin.delete(`/api/artikel/${pommes.id}`);
  assert.equal((await admin.get('/api/artikel')).body.length, 0);
  assert.equal(db.prepare('SELECT geloescht FROM artikel WHERE id = ?').get(pommes.id).geloescht, 1);
});

test('Artikel-Validierung lehnt Unsinn verständlich ab', async () => {
  const { app, db } = frischeApp();
  const admin = await angemeldeterAgent(app, db, 'admin');
  const ohneName = await admin.post('/api/artikel').send({ name: '', farbe: '#ff0000', preis_cent: 100 });
  assert.equal(ohneName.status, 400);
  assert.ok(ohneName.body.fehler.length > 0);
  const falscheFarbe = await admin.post('/api/artikel').send({ name: 'Cola', farbe: 'rot', preis_cent: 100 });
  assert.equal(falscheFarbe.status, 400);
  const falscherPreis = await admin.post('/api/artikel').send({ name: 'Cola', farbe: '#ff0000', preis_cent: -5 });
  assert.equal(falscherPreis.status, 400);
});

test('Verwaltung sieht keine Einkaufskosten und kann sie nicht setzen oder ändern', async () => {
  const { app, db } = frischeApp();
  const admin = await angemeldeterAgent(app, db, 'admin');
  const verwaltung = await angemeldeterAgent(app, db, 'verwaltung');

  const vonVerwaltungAngelegt = (await verwaltung.post('/api/artikel').send({
    name: 'Cola', farbe: '#333333', preis_cent: 250,
    einkaufskosten_cent: 999, beilagen_ids: [], sortierung: 1,
  })).body;
  assert.equal(vonVerwaltungAngelegt.einkaufskosten_cent, undefined);
  assert.equal(
    db.prepare('SELECT einkaufskosten_cent FROM artikel WHERE id = ?').get(vonVerwaltungAngelegt.id).einkaufskosten_cent,
    null
  );

  const pommes = (await admin.post('/api/artikel').send({
    name: 'Pommes', farbe: '#f5c211', preis_cent: 350,
    einkaufskosten_cent: 120, beilagen_ids: [], sortierung: 2,
  })).body;
  assert.equal(pommes.einkaufskosten_cent, 120);

  const listeVerwaltung = (await verwaltung.get('/api/artikel')).body;
  const pommesFuerVerwaltung = listeVerwaltung.find((a) => a.name === 'Pommes');
  assert.equal(pommesFuerVerwaltung.einkaufskosten_cent, undefined);

  const geaendert = (await verwaltung.put(`/api/artikel/${pommes.id}`).send({
    ...pommesFuerVerwaltung, einkaufskosten_cent: 1,
  })).body;
  assert.equal(geaendert.einkaufskosten_cent, undefined);
  assert.equal(
    db.prepare('SELECT einkaufskosten_cent FROM artikel WHERE id = ?').get(pommes.id).einkaufskosten_cent,
    120
  );
});

test('Beilage bearbeiten und Soft-Delete', async () => {
  const { app, db } = frischeApp();
  const admin = await angemeldeterAgent(app, db, 'admin');
  const mayo = (await admin.post('/api/beilagen').send({ name: 'Mayo' })).body;

  await admin.put(`/api/beilagen/${mayo.id}`).send({ name: 'Mayonnaise', aktiv: 0 });
  let liste = (await admin.get('/api/beilagen')).body;
  assert.equal(liste[0].name, 'Mayonnaise');
  assert.equal(liste[0].aktiv, 0);

  await admin.delete(`/api/beilagen/${mayo.id}`);
  assert.equal((await admin.get('/api/beilagen')).body.length, 0);
  assert.equal(db.prepare('SELECT geloescht FROM beilage WHERE id = ?').get(mayo.id).geloescht, 1);
});
