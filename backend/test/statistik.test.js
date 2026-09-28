import test from 'node:test';
import assert from 'node:assert/strict';
import { frischeApp, angemeldeterAgent } from './helfer.js';
import { jetztIso, heutigesDatum } from '../src/zeit.js';

test('Tagesstatistik: Stückzahlen, Umsatz, Gewinn, Stunden, Stornos', async () => {
  const { app, db } = frischeApp();
  const admin = await angemeldeterAgent(app, db, 'admin');
  const kasse = await angemeldeterAgent(app, db, 'kasse');

  const pommes = (await admin.post('/api/artikel').send({
    name: 'Pommes', name_tr: 'Patates', farbe: '#f5c211', preis_cent: 350,
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
  assert.equal(proArtikel.Pommes.artikel_name_tr, 'Patates');
  assert.equal(proArtikel.Cola.artikel_name_tr, null);
  assert.equal(proArtikel.Cola.stueck, 2);
  assert.equal(proArtikel.Cola.umsatz_cent, 500);
  assert.equal(proArtikel.Cola.gewinn_cent, 500);
  assert.equal(proArtikel.Cola.stueck_ohne_kosten, 2);

  assert.equal(statistik.gesamt.stueck, 4);
  assert.equal(statistik.gesamt.umsatz_cent, 1200);
  assert.equal(statistik.gesamt.gewinn_cent, 460 + 500);
  assert.equal(statistik.gesamt.stueck_ohne_kosten, 2);

  const stunde = Number(jetztIso().slice(11, 13));
  assert.deepEqual(statistik.stunden, [{ stunde, stueck: 4 }]);

  const nurCola = (await admin.get(`/api/statistik/tag/${heutigesDatum()}?artikel_id=${cola.id}`)).body;
  assert.deepEqual(nurCola.stunden, [{ stunde, stueck: 2 }]);

  assert.equal(statistik.stornos.length, 1);
  assert.equal(statistik.stornos[0].nummer, stornierte.nummer);
  assert.equal(statistik.stornos[0].artikel_name, 'Pommes');
  assert.equal(statistik.stornos[0].artikel_name_tr, 'Patates');
  assert.equal(statistik.stornos[0].preis_cent, 350);
  assert.equal(statistik.stornos[0].storniert_von, 'test-kasse');
  assert.match(statistik.stornos[0].zeit, /^\d{2}:\d{2}$/);
  assert.equal(statistik.stornos[0].datum, undefined);
});

test('Verwaltung sieht in der Statistik keine Geldsummen, Admin weiterhin schon', async () => {
  const { app, db } = frischeApp();
  const admin = await angemeldeterAgent(app, db, 'admin');
  const kasse = await angemeldeterAgent(app, db, 'kasse');
  const verwaltung = await angemeldeterAgent(app, db, 'verwaltung');

  const pommes = (await admin.post('/api/artikel').send({
    name: 'Pommes', farbe: '#f5c211', preis_cent: 350,
    einkaufskosten_cent: 120, beilagen_ids: [], sortierung: 1,
  })).body;
  await kasse.post('/api/kasse/kassieren').send({
    positionen: [{ artikel_id: pommes.id, beilagen_ids: [] }],
  });

  const tagVerwaltung = (await verwaltung.get(`/api/statistik/tag/${heutigesDatum()}`)).body;
  assert.equal(tagVerwaltung.gesamt.stueck, 1);
  assert.equal(tagVerwaltung.gesamt.umsatz_cent, undefined);
  assert.equal(tagVerwaltung.gesamt.gewinn_cent, undefined);
  assert.equal(tagVerwaltung.gesamt.stueck_ohne_kosten, undefined);
  assert.equal(tagVerwaltung.artikel[0].stueck, 1);
  assert.equal(tagVerwaltung.artikel[0].umsatz_cent, undefined);

  const tagAdmin = (await admin.get(`/api/statistik/tag/${heutigesDatum()}`)).body;
  assert.equal(tagAdmin.gesamt.umsatz_cent, 350);
  assert.equal(tagAdmin.artikel[0].umsatz_cent, 350);

  const zeitraumVerwaltung = (await verwaltung.get(
    `/api/statistik/zeitraum?von=${heutigesDatum()}&bis=${heutigesDatum()}`
  )).body;
  assert.equal(zeitraumVerwaltung.gesamt.umsatz_cent, undefined);
  assert.equal(zeitraumVerwaltung.gesamt.stueck, 1);
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

test('Zeitraumstatistik: mehrere Tage, Tages-Aufschlüsselung, Stornos, leerer Zeitraum', async () => {
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

  const tag1 = '2026-01-10';
  const verkaufTag1 = (await kasse.post('/api/kasse/kassieren').send({
    positionen: [
      { artikel_id: pommes.id, beilagen_ids: [] },
      { artikel_id: pommes.id, beilagen_ids: [] },
    ],
  })).body;
  await kasse.post(`/api/kasse/storno/${verkaufTag1.kaertchen[0].id}`);
  db.prepare('UPDATE kaertchen SET erstellt_am = ? WHERE id IN (?, ?)')
    .run(`${tag1}T10:00:00`, verkaufTag1.kaertchen[0].id, verkaufTag1.kaertchen[1].id);
  db.prepare('UPDATE kaertchen SET storniert_am = ? WHERE id = ?')
    .run(`${tag1}T10:05:00`, verkaufTag1.kaertchen[0].id);

  const tag2 = '2026-01-11';
  const verkaufTag2 = (await kasse.post('/api/kasse/kassieren').send({
    positionen: [{ artikel_id: cola.id, beilagen_ids: [] }],
  })).body;
  db.prepare('UPDATE kaertchen SET erstellt_am = ? WHERE id = ?')
    .run(`${tag2}T09:00:00`, verkaufTag2.kaertchen[0].id);

  const tagAusserhalb = '2026-02-01';
  const verkaufAusserhalb = (await kasse.post('/api/kasse/kassieren').send({
    positionen: [{ artikel_id: cola.id, beilagen_ids: [] }],
  })).body;
  db.prepare('UPDATE kaertchen SET erstellt_am = ? WHERE id = ?')
    .run(`${tagAusserhalb}T09:00:00`, verkaufAusserhalb.kaertchen[0].id);

  const statistik = (await admin.get(`/api/statistik/zeitraum?von=${tag1}&bis=${tag2}`)).body;

  const proArtikel = Object.fromEntries(statistik.artikel.map((a) => [a.artikel_name, a]));
  assert.equal(proArtikel.Pommes.stueck, 1);
  assert.equal(proArtikel.Pommes.umsatz_cent, 350);
  assert.equal(proArtikel.Cola.stueck, 1);
  assert.equal(proArtikel.Cola.umsatz_cent, 250);

  assert.equal(statistik.gesamt.stueck, 2);
  assert.equal(statistik.gesamt.umsatz_cent, 600);

  assert.deepEqual(statistik.tage, [
    { tag: tag1, stueck: 1 },
    { tag: tag2, stueck: 1 },
  ]);

  const nurCola = (await admin.get(`/api/statistik/zeitraum?von=${tag1}&bis=${tag2}&artikel_id=${cola.id}`)).body;
  assert.deepEqual(nurCola.tage, [{ tag: tag2, stueck: 1 }]);

  assert.equal(statistik.stornos.length, 1);
  assert.equal(statistik.stornos[0].datum, tag1);
  assert.equal(statistik.stornos[0].zeit, '10:05');
  assert.equal(statistik.stornos[0].artikel_name, 'Pommes');

  const leer = (await admin.get('/api/statistik/zeitraum?von=1999-01-01&bis=1999-01-31')).body;
  assert.deepEqual(leer.artikel, []);
  assert.deepEqual(leer.tage, []);
  assert.deepEqual(leer.stornos, []);
  assert.equal(leer.gesamt.stueck, 0);
});

test('Zeitraumstatistik: fehlende von/bis liefert verständliche Fehlermeldung', async () => {
  const { app, db } = frischeApp();
  const admin = await angemeldeterAgent(app, db, 'admin');

  const ohneVon = await admin.get('/api/statistik/zeitraum?bis=2026-01-11');
  assert.equal(ohneVon.status, 400);
  assert.equal(ohneVon.body.fehler, 'Bitte einen Start- und einen Endtag angeben.');

  const ohneBeides = await admin.get('/api/statistik/zeitraum');
  assert.equal(ohneBeides.status, 400);
  assert.equal(ohneBeides.body.fehler, 'Bitte einen Start- und einen Endtag angeben.');
});

test('Tag mit ausschließlich stornierten Verkäufen ist auswählbar, Umsatz null, Storno sichtbar', async () => {
  const { app, db } = frischeApp();
  const admin = await angemeldeterAgent(app, db, 'admin');
  const kasse = await angemeldeterAgent(app, db, 'kasse');
  const artikel = (await admin.post('/api/artikel').send({
    name: 'Adana', farbe: '#2255cc', preis_cent: 700, beilagen_ids: [], sortierung: 1,
  })).body;
  const kaertchen = (await kasse.post('/api/kasse/kassieren').send({
    positionen: [{ artikel_id: artikel.id, beilagen_ids: [] }],
  })).body.kaertchen[0];
  await kasse.post(`/api/kasse/storno/${kaertchen.id}`);
  db.prepare(
    `UPDATE kaertchen SET erstellt_am = '2020-01-01T12:00:00+01:00', storniert_am = '2020-01-01T12:05:00+01:00'`
  ).run();

  const tage = (await admin.get('/api/statistik/verkaufstage')).body;
  assert.deepEqual(tage, ['2020-01-01']);

  const tag = (await admin.get('/api/statistik/tag/2020-01-01')).body;
  assert.equal(tag.gesamt.stueck, 0);
  assert.equal(tag.gesamt.umsatz_cent, 0);
  assert.equal(tag.stornos.length, 1);
});

test('Statistik-Artikelliste enthält auch gelöschte Artikel mit dem Namen vom Verkauf', async () => {
  const { app, db } = frischeApp();
  const admin = await angemeldeterAgent(app, db, 'admin');
  const kasse = await angemeldeterAgent(app, db, 'kasse');
  const verwaltung = await angemeldeterAgent(app, db, 'verwaltung');
  const alt = (await admin.post('/api/artikel').send({
    name: 'Adana', name_tr: 'Adana TR', farbe: '#2255cc', preis_cent: 700, beilagen_ids: [], sortierung: 1,
  })).body;
  await admin.post('/api/artikel').send({
    name: 'Nie verkauft', farbe: '#2255cc', preis_cent: 100, beilagen_ids: [], sortierung: 2,
  });
  await kasse.post('/api/kasse/kassieren').send({
    positionen: [{ artikel_id: alt.id, beilagen_ids: [] }],
  });
  await admin.delete(`/api/artikel/${alt.id}`);

  const liste = (await verwaltung.get('/api/statistik/artikel')).body;
  assert.deepEqual(liste, [{ id: alt.id, name: 'Adana', name_tr: 'Adana TR' }]);
  assert.equal((await kasse.get('/api/statistik/artikel')).status, 403);
});
