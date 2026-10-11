import test from 'node:test';
import assert from 'node:assert/strict';
import { frischeApp, angemeldeterAgent } from './helfer.js';

test('Artikel ohne angegebene Blöcke bekommt automatisch einen unbegrenzten Default-Block', async () => {
  const { app, db } = frischeApp();
  const admin = await angemeldeterAgent(app, db, 'admin');
  const pommes = (await admin.post('/api/artikel').send({
    name: 'Pommes', farbe: '#f5c211', preis_cent: 350, beilagen_ids: [],
  })).body;
  assert.deepEqual(pommes.bloecke, [{ von: 1, bis: 999999999 }]);
  assert.equal(pommes.hinweis, null);
});

test('Artikel mit mehreren Blöcken: werden sortiert gespeichert und zurückgegeben', async () => {
  const { app, db } = frischeApp();
  const admin = await angemeldeterAgent(app, db, 'admin');
  const pommes = (await admin.post('/api/artikel').send({
    name: 'Pommes', farbe: '#f5c211', preis_cent: 350, beilagen_ids: [],
    bloecke: [{ von: 240, bis: 300 }, { von: 1, bis: 100 }, { von: 161, bis: 200 }],
  })).body;
  assert.deepEqual(pommes.bloecke, [{ von: 1, bis: 100 }, { von: 161, bis: 200 }, { von: 240, bis: 300 }]);
});

test('Artikel mit sich überschneidenden Blöcken wird mit Klartext abgelehnt', async () => {
  const { app, db } = frischeApp();
  const admin = await angemeldeterAgent(app, db, 'admin');
  const antwort = await admin.post('/api/artikel').send({
    name: 'Pommes', farbe: '#f5c211', preis_cent: 350, beilagen_ids: [],
    bloecke: [{ von: 1, bis: 100 }, { von: 50, bis: 150 }],
  });
  assert.equal(antwort.status, 400);
  assert.match(antwort.body.fehler, /überschneiden/);
});

test('PUT ohne bloecke-Feld lässt bestehende Blöcke unverändert', async () => {
  const { app, db } = frischeApp();
  const admin = await angemeldeterAgent(app, db, 'admin');
  const pommes = (await admin.post('/api/artikel').send({
    name: 'Pommes', farbe: '#f5c211', preis_cent: 350, beilagen_ids: [],
    bloecke: [{ von: 1, bis: 100 }],
  })).body;
  const { bloecke, ...ohneBloecke } = pommes;
  const geaendert = (await admin.put(`/api/artikel/${pommes.id}`).send({
    ...ohneBloecke, aktiv: 1, beilagen_ids: [],
  })).body;
  assert.deepEqual(geaendert.bloecke, [{ von: 1, bis: 100 }]);
});

test('PUT mit bloecke-Feld ersetzt die bisherigen Blöcke komplett', async () => {
  const { app, db } = frischeApp();
  const admin = await angemeldeterAgent(app, db, 'admin');
  const pommes = (await admin.post('/api/artikel').send({
    name: 'Pommes', farbe: '#f5c211', preis_cent: 350, beilagen_ids: [],
    bloecke: [{ von: 1, bis: 100 }],
  })).body;
  const geaendert = (await admin.put(`/api/artikel/${pommes.id}`).send({
    ...pommes, aktiv: 1, beilagen_ids: [], bloecke: [{ von: 1, bis: 50 }, { von: 61, bis: 90 }],
  })).body;
  assert.deepEqual(geaendert.bloecke, [{ von: 1, bis: 50 }, { von: 61, bis: 90 }]);
});

test('Kassieren springt beim Blockende automatisch zum nächsten Block', async () => {
  const { app, db } = frischeApp();
  const admin = await angemeldeterAgent(app, db, 'admin');
  const pommes = (await admin.post('/api/artikel').send({
    name: 'Pommes', farbe: '#f5c211', preis_cent: 350, beilagen_ids: [],
    bloecke: [{ von: 1, bis: 2 }, { von: 161, bis: 200 }],
  })).body;

  const kasse = await angemeldeterAgent(app, db, 'kasse');
  const ergebnis = (await kasse.post('/api/kasse/kassieren').send({
    positionen: [
      { artikel_id: pommes.id, beilagen_ids: [] },
      { artikel_id: pommes.id, beilagen_ids: [] },
      { artikel_id: pommes.id, beilagen_ids: [] },
    ],
  })).body;
  assert.deepEqual(ergebnis.kaertchen.map((k) => k.nummer), [1, 2, 161]);
});

test('Kassieren zeigt einen Hinweis, wenn nur noch wenige Kärtchen übrig sind', async () => {
  const { app, db } = frischeApp();
  const admin = await angemeldeterAgent(app, db, 'admin');
  const pommes = (await admin.post('/api/artikel').send({
    name: 'Pommes', farbe: '#f5c211', preis_cent: 350, beilagen_ids: [],
    bloecke: [{ von: 1, bis: 3 }],
  })).body;

  const kasse = await angemeldeterAgent(app, db, 'kasse');
  const ergebnis = (await kasse.post('/api/kasse/kassieren').send({
    positionen: [{ artikel_id: pommes.id, beilagen_ids: [] }],
  })).body;
  assert.match(ergebnis.kaertchen[0].hinweis, /neuen Nummernblock eintragen/);
});

test('Kassieren nennt bei Blockwechsel die Nummern des nächsten Blocks statt "Rolle" zu sagen', async () => {
  const { app, db } = frischeApp();
  const admin = await angemeldeterAgent(app, db, 'admin');
  const pommes = (await admin.post('/api/artikel').send({
    name: 'Pommes', farbe: '#f5c211', preis_cent: 350, beilagen_ids: [],
    bloecke: [{ von: 1, bis: 3 }, { von: 161, bis: 200 }],
  })).body;

  const kasse = await angemeldeterAgent(app, db, 'kasse');
  const ergebnis = (await kasse.post('/api/kasse/kassieren').send({
    positionen: [{ artikel_id: pommes.id, beilagen_ids: [] }],
  })).body;
  assert.doesNotMatch(ergebnis.kaertchen[0].hinweis, /rolle/i);
  assert.match(ergebnis.kaertchen[0].hinweis, /161/);
  assert.match(ergebnis.kaertchen[0].hinweis, /200/);
});

test('Kassieren zeigt den Hinweis bei mehreren Kärtchen desselben Artikels nur einmal', async () => {
  const { app, db } = frischeApp();
  const admin = await angemeldeterAgent(app, db, 'admin');
  const pommes = (await admin.post('/api/artikel').send({
    name: 'Pommes', farbe: '#f5c211', preis_cent: 350, beilagen_ids: [],
    bloecke: [{ von: 1, bis: 5 }],
  })).body;

  const kasse = await angemeldeterAgent(app, db, 'kasse');
  const ergebnis = (await kasse.post('/api/kasse/kassieren').send({
    positionen: [
      { artikel_id: pommes.id, beilagen_ids: [] },
      { artikel_id: pommes.id, beilagen_ids: [] },
      { artikel_id: pommes.id, beilagen_ids: [] },
    ],
  })).body;
  const hinweise = ergebnis.kaertchen.map((k) => k.hinweis);
  assert.deepEqual(hinweise.slice(0, 2), [null, null]);
  assert.match(hinweise[2], /neuen Nummernblock eintragen/);
});

test('Kassieren meldet den Blockwechsel, auch wenn die Bestellung danach im neuen Block komfortabel endet', async () => {
  const { app, db } = frischeApp();
  const admin = await angemeldeterAgent(app, db, 'admin');
  const pommes = (await admin.post('/api/artikel').send({
    name: 'Pommes', farbe: '#f5c211', preis_cent: 350, beilagen_ids: [],
    bloecke: [{ von: 1, bis: 100 }, { von: 161, bis: 260 }],
  })).body;
  db.prepare('UPDATE artikel SET naechste_nummer = 99 WHERE id = ?').run(pommes.id);

  const kasse = await angemeldeterAgent(app, db, 'kasse');
  const ergebnis = (await kasse.post('/api/kasse/kassieren').send({
    positionen: [
      { artikel_id: pommes.id, beilagen_ids: [] },
      { artikel_id: pommes.id, beilagen_ids: [] },
      { artikel_id: pommes.id, beilagen_ids: [] },
    ],
  })).body;
  assert.deepEqual(ergebnis.kaertchen.map((k) => k.nummer), [99, 100, 161]);
  const hinweise = ergebnis.kaertchen.map((k) => k.hinweis).filter((h) => h !== null);
  assert.equal(hinweise.length, 1);
  assert.match(hinweise[0], /161/);
  assert.match(hinweise[0], /260/);
});

test('Kassieren meldet, wenn eine Nummer außerhalb aller Blöcke durchgelassen wird', async () => {
  const { app, db } = frischeApp();
  const admin = await angemeldeterAgent(app, db, 'admin');
  const pommes = (await admin.post('/api/artikel').send({
    name: 'Pommes', farbe: '#f5c211', preis_cent: 350, beilagen_ids: [],
    bloecke: [{ von: 1, bis: 1 }],
  })).body;

  const kasse = await angemeldeterAgent(app, db, 'kasse');
  await kasse.post('/api/kasse/kassieren').send({
    positionen: [{ artikel_id: pommes.id, beilagen_ids: [] }],
  });
  const ergebnis = (await kasse.post('/api/kasse/kassieren').send({
    positionen: [{ artikel_id: pommes.id, beilagen_ids: [] }],
  })).body;
  assert.equal(ergebnis.kaertchen[0].nummer, 2);
  assert.match(ergebnis.kaertchen[0].hinweis, /kein gültiger Nummernblock|ungeprüft weitergezählt/i);
});

test('Verwaltung sieht Blöcke und Hinweis genauso wie Admin', async () => {
  const { app, db } = frischeApp();
  const admin = await angemeldeterAgent(app, db, 'admin');
  const verwaltung = await angemeldeterAgent(app, db, 'verwaltung');
  await admin.post('/api/artikel').send({
    name: 'Pommes', farbe: '#f5c211', preis_cent: 350, beilagen_ids: [],
    bloecke: [{ von: 1, bis: 100 }],
  });
  const liste = (await verwaltung.get('/api/artikel')).body;
  assert.deepEqual(liste[0].bloecke, [{ von: 1, bis: 100 }]);
});
