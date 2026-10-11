import test from 'node:test';
import assert from 'node:assert/strict';
import { frischeApp, angemeldeterAgent } from './helfer.js';

async function vorbereiten() {
  const { app, db } = frischeApp();
  const admin = await angemeldeterAgent(app, db, 'admin');
  const kasse = await angemeldeterAgent(app, db, 'kasse');
  const pommes = (await admin.post('/api/artikel').send({
    name: 'Pommes', farbe: '#f5c211', preis_cent: 350, beilagen_ids: [], sortierung: 1,
  })).body;
  return { db, kasse, pommes };
}

function anzahl(db, tabelle) {
  return db.prepare(`SELECT COUNT(*) AS n FROM ${tabelle}`).get().n;
}

test('Gleiche Vorgangskennung zweimal gesendet liefert dasselbe Ergebnis und bucht nur einmal', async () => {
  const { db, kasse, pommes } = await vorbereiten();
  const inhalt = {
    positionen: [{ artikel_id: pommes.id, beilagen_ids: [] }],
    erwartete_nummern: [1], erwartete_preise_cent: [350],
    vorgang_kennung: 'kennung-12345678',
  };
  const erste = await kasse.post('/api/kasse/kassieren').send(inhalt);
  const zweite = await kasse.post('/api/kasse/kassieren').send(inhalt);

  assert.equal(erste.status, 200);
  assert.equal(zweite.status, 200);
  assert.deepEqual(zweite.body, erste.body);
  assert.equal(anzahl(db, 'kassiervorgang'), 1);
  assert.equal(anzahl(db, 'kaertchen'), 1);
});

test('Gleiche Vorgangskennung mit anderem Inhalt wird abgewiesen', async () => {
  const { db, kasse, pommes } = await vorbereiten();
  const kennung = 'kennung-12345678';
  await kasse.post('/api/kasse/kassieren').send({
    positionen: [{ artikel_id: pommes.id, beilagen_ids: [] }], vorgang_kennung: kennung,
  });
  const andere = await kasse.post('/api/kasse/kassieren').send({
    positionen: [{ artikel_id: pommes.id, beilagen_ids: [] }, { artikel_id: pommes.id, beilagen_ids: [] }],
    vorgang_kennung: kennung,
  });

  assert.equal(andere.status, 409);
  assert.match(andere.body.fehler, /andere Bestellung/);
  assert.equal(anzahl(db, 'kaertchen'), 1);
});

test('Neue Kennung erlaubt einen inhaltlich gleichen neuen Verkauf', async () => {
  const { db, kasse, pommes } = await vorbereiten();
  const positionen = [{ artikel_id: pommes.id, beilagen_ids: [] }];
  await kasse.post('/api/kasse/kassieren').send({ positionen, vorgang_kennung: 'kennung-aaaaaaaa' });
  const neu = await kasse.post('/api/kasse/kassieren').send({ positionen, vorgang_kennung: 'kennung-bbbbbbbb' });

  assert.equal(neu.status, 200);
  assert.equal(neu.body.kaertchen[0].nummer, 2);
  assert.equal(anzahl(db, 'kassiervorgang'), 2);
});

test('Ungültige Vorgangskennung wird mit verständlichem Text abgewiesen', async () => {
  const { db, kasse, pommes } = await vorbereiten();
  const antwort = await kasse.post('/api/kasse/kassieren').send({
    positionen: [{ artikel_id: pommes.id, beilagen_ids: [] }], vorgang_kennung: 42,
  });

  assert.equal(antwort.status, 400);
  assert.equal(anzahl(db, 'kaertchen'), 0);
});

test('Gleiche Kennung und gleiche Positionen, aber neue erwartete Nummern nach Zurück, liefert das ursprüngliche Ergebnis', async () => {
  const { db, kasse, pommes } = await vorbereiten();
  const positionen = [{ artikel_id: pommes.id, beilagen_ids: [] }];
  const erste = await kasse.post('/api/kasse/kassieren').send({
    positionen, erwartete_nummern: [1], erwartete_preise_cent: [350], vorgang_kennung: 'kennung-12345678',
  });
  const nachZurueck = await kasse.post('/api/kasse/kassieren').send({
    positionen, erwartete_nummern: [2], erwartete_preise_cent: [350], vorgang_kennung: 'kennung-12345678',
  });

  assert.equal(nachZurueck.status, 200);
  assert.deepEqual(nachZurueck.body, erste.body);
  assert.equal(anzahl(db, 'kaertchen'), 1);
});

test('Gleiche Kennung und gleiche Positionen, aber Listen mit falscher Länge, liefert das ursprüngliche Ergebnis', async () => {
  const { db, kasse, pommes } = await vorbereiten();
  const positionen = [{ artikel_id: pommes.id, beilagen_ids: [] }];
  const erste = await kasse.post('/api/kasse/kassieren').send({
    positionen, erwartete_nummern: [1], erwartete_preise_cent: [350], vorgang_kennung: 'kennung-12345678',
  });
  const wiederholung = await kasse.post('/api/kasse/kassieren').send({
    positionen, erwartete_nummern: [1, 2], erwartete_preise_cent: [350, 350], vorgang_kennung: 'kennung-12345678',
  });

  assert.equal(wiederholung.status, 200);
  assert.deepEqual(wiederholung.body, erste.body);
  assert.equal(anzahl(db, 'kaertchen'), 1);
});
