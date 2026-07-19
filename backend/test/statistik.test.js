import test from 'node:test';
import assert from 'node:assert/strict';
import { frischeApp, angemeldeterAgent } from './helfer.js';
import { jetztIso, heutigesDatum } from '../src/zeit.js';

test('Tagesstatistik: Stückzahlen, Umsatz, Gewinn, Stunden, Stornos', async () => {
  const { app, db } = frischeApp();
  const admin = await angemeldeterAgent(app, db, 'admin');
  const kasse = await angemeldeterAgent(app, db, 'kasse');

  const pommes = (await admin.post('/api/artikel').send({
    name: 'Pommes', farbe: '#f5c211', preis_cent: 350,
    einkaufskosten_cent: 120, beilagen_ids: [], sortierung: 1,
  })).body;
  const cola = (await admin.post('/api/artikel').send({
    name: 'Cola', farbe: '#333333', preis_cent: 250, beilagen_ids: [], sortierung: 2,
  })).body;

  const ergebnis = (await kasse.post('/api/kasse/kassieren').send({
    positionen: [
      { artikel_id: pommes.id, beilagen_ids: [] },
      { artikel_id: pommes.id, beilagen_ids: [] },
      { artikel_id: pommes.id, beilagen_ids: [] },
      { artikel_id: cola.id, beilagen_ids: [] },
      { artikel_id: cola.id, beilagen_ids: [] },
    ],
  })).body;
  const stornierte = ergebnis.kaertchen[2];
  await kasse.post(`/api/kasse/storno/${stornierte.id}`);

  const statistik = (await admin.get(`/api/statistik/tag/${heutigesDatum()}`)).body;

  const proArtikel = Object.fromEntries(statistik.artikel.map((a) => [a.artikel_name, a]));
  assert.equal(proArtikel.Pommes.stueck, 2);
  assert.equal(proArtikel.Pommes.umsatz_cent, 700);
  assert.equal(proArtikel.Pommes.gewinn_cent, 2 * (350 - 120));
  assert.equal(proArtikel.Pommes.stueck_ohne_kosten, 0);
  assert.equal(proArtikel.Cola.stueck, 2);
  assert.equal(proArtikel.Cola.umsatz_cent, 500);
  assert.equal(proArtikel.Cola.gewinn_cent, 0);
  assert.equal(proArtikel.Cola.stueck_ohne_kosten, 2);

  assert.equal(statistik.gesamt.stueck, 4);
  assert.equal(statistik.gesamt.umsatz_cent, 1200);
  assert.equal(statistik.gesamt.gewinn_cent, 460);
  assert.equal(statistik.gesamt.stueck_ohne_kosten, 2);

  const stunde = Number(jetztIso().slice(11, 13));
  assert.deepEqual(statistik.stunden, [{ stunde, stueck: 4 }]);

  const nurCola = (await admin.get(`/api/statistik/tag/${heutigesDatum()}?artikel_id=${cola.id}`)).body;
  assert.deepEqual(nurCola.stunden, [{ stunde, stueck: 2 }]);

  assert.equal(statistik.stornos.length, 1);
  assert.equal(statistik.stornos[0].nummer, stornierte.nummer);
  assert.equal(statistik.stornos[0].artikel_name, 'Pommes');
  assert.equal(statistik.stornos[0].preis_cent, 350);
  assert.equal(statistik.stornos[0].storniert_von, 'test-kasse');
  assert.match(statistik.stornos[0].zeit, /^\d{2}:\d{2}$/);
});

test('Verkaufstage-Liste und leerer Tag', async () => {
  const { app, db } = frischeApp();
  const admin = await angemeldeterAgent(app, db, 'admin');
  const kasse = await angemeldeterAgent(app, db, 'kasse');
  const artikel = (await admin.post('/api/artikel').send({
    name: 'Adana', farbe: '#2255cc', preis_cent: 700, beilagen_ids: [], sortierung: 1,
  })).body;
  await kasse.post('/api/kasse/kassieren').send({
    positionen: [{ artikel_id: artikel.id, beilagen_ids: [] }],
  });

  const tage = (await admin.get('/api/statistik/verkaufstage')).body;
  assert.ok(tage.includes(heutigesDatum()));

  const leer = (await admin.get('/api/statistik/tag/1999-01-01')).body;
  assert.deepEqual(leer.artikel, []);
  assert.deepEqual(leer.stunden, []);
  assert.deepEqual(leer.stornos, []);
  assert.equal(leer.gesamt.stueck, 0);
  assert.equal(leer.gesamt.umsatz_cent, 0);
  assert.equal(leer.gesamt.gewinn_cent, 0);
  assert.equal(leer.gesamt.stueck_ohne_kosten, 0);
});
