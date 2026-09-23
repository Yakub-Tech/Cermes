import test from 'node:test';
import assert from 'node:assert/strict';
import { frischeApp, angemeldeterAgent } from './helfer.js';
import { heutigesDatum } from '../src/zeit.js';

test('Benutzer mit Kassier- und Storno-Historie lässt sich löschen, Kärtchen und Kassiervorgang bleiben unverändert', async () => {
  const { app, db } = frischeApp();
  const admin = await angemeldeterAgent(app, db, 'admin');
  const kasse = await angemeldeterAgent(app, db, 'kasse');
  const kasseId = db.prepare("SELECT id FROM benutzer WHERE benutzername = 'test-kasse'").get().id;

  const pommes = (await admin.post('/api/artikel').send({
    name: 'Pommes', farbe: '#f5c211', preis_cent: 350, beilagen_ids: [], sortierung: 1,
  })).body;
  const ergebnis = (await kasse.post('/api/kasse/kassieren').send({
    positionen: [
      { artikel_id: pommes.id, beilagen_ids: [] },
      { artikel_id: pommes.id, beilagen_ids: [] },
    ],
  })).body;
  const kassiervorgangId = ergebnis.kassiervorgang_id;
  const stornierteId = ergebnis.kaertchen[0].id;
  await kasse.post(`/api/kasse/storno/${stornierteId}`);

  const vorherKassiervorgang = db.prepare('SELECT * FROM kassiervorgang WHERE id = ?').get(kassiervorgangId);
  const vorherKaertchen = db.prepare('SELECT * FROM kaertchen WHERE kassiervorgang_id = ?').all(kassiervorgangId);

  const loeschen = await admin.delete(`/api/benutzer/${kasseId}`);
  assert.equal(loeschen.status, 200);
  assert.equal(db.prepare("SELECT COUNT(*) AS n FROM benutzer WHERE id = ?").get(kasseId).n, 0);

  const nachherKassiervorgang = db.prepare('SELECT * FROM kassiervorgang WHERE id = ?').get(kassiervorgangId);
  const nachherKaertchen = db.prepare('SELECT * FROM kaertchen WHERE kassiervorgang_id = ?').all(kassiervorgangId);
  assert.deepEqual(nachherKassiervorgang, vorherKassiervorgang);
  assert.deepEqual(nachherKaertchen, vorherKaertchen);
  assert.equal(nachherKassiervorgang.benutzer_id, kasseId);
  assert.equal(nachherKaertchen.find((k) => k.id === stornierteId).storniert_von, kasseId);
});

test('Storno-Übersicht zeigt gelöschte Konten mit verständlichem Platzhalter statt zu verschwinden', async () => {
  const { app, db } = frischeApp();
  const admin = await angemeldeterAgent(app, db, 'admin');
  const kasse = await angemeldeterAgent(app, db, 'kasse');
  const kasseId = db.prepare("SELECT id FROM benutzer WHERE benutzername = 'test-kasse'").get().id;

  const pommes = (await admin.post('/api/artikel').send({
    name: 'Pommes', farbe: '#f5c211', preis_cent: 350, beilagen_ids: [], sortierung: 1,
  })).body;
  const ergebnis = (await kasse.post('/api/kasse/kassieren').send({
    positionen: [{ artikel_id: pommes.id, beilagen_ids: [] }],
  })).body;
  await kasse.post(`/api/kasse/storno/${ergebnis.kaertchen[0].id}`);

  await admin.delete(`/api/benutzer/${kasseId}`);

  const statistik = (await admin.get(`/api/statistik/tag/${heutigesDatum()}`)).body;
  assert.equal(statistik.stornos.length, 1, 'Storno bleibt in der Statistik sichtbar, verschwindet nicht');
  assert.equal(statistik.stornos[0].storniert_von, '(gelöschtes Konto)');
});
