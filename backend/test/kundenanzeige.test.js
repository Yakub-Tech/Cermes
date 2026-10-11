import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { kundenzustandLesen, kundenzustandSchreiben, kassenNummerPruefen } from '../src/kundenzustand.js';
import { frischeApp, angemeldeterAgent } from './helfer.js';

const KASSENNUMMER_FEHLER = 'Die Kassennummer ist ungültig. Erlaubt sind die Zahlen 1 bis 9.';

test('Kundenzustand: Standardwert leer, Schreiben und Lesen', () => {
  assert.deepEqual(kundenzustandLesen(1), { warenkorb: [], fokus: null, summe_cent: null, sprache: 'de', design: 'dunkel' });
  kundenzustandSchreiben(1, {
    warenkorb: [{ artikel_name: 'Pommes' }], fokus: { artikel_name: 'Pommes' }, summe_cent: 350, sprache: 'tr', design: 'hell',
  });
  assert.deepEqual(kundenzustandLesen(1), {
    warenkorb: [{ artikel_name: 'Pommes' }], fokus: { artikel_name: 'Pommes' }, summe_cent: 350, sprache: 'tr', design: 'hell',
  });
});

test('Kundenzustand: unvollständige Daten werden robust auf leer/null abgebildet', () => {
  kundenzustandSchreiben(1, {});
  assert.deepEqual(kundenzustandLesen(1), { warenkorb: [], fokus: null, summe_cent: null, sprache: 'de', design: 'dunkel' });
});

test('Kundenzustand: sprache nur bei "de" oder "tr" übernommen, sonst "de"', () => {
  kundenzustandSchreiben(1, { sprache: 'tr' });
  assert.equal(kundenzustandLesen(1).sprache, 'tr');
  kundenzustandSchreiben(1, { sprache: 'fr' });
  assert.equal(kundenzustandLesen(1).sprache, 'de');
  kundenzustandSchreiben(1, { sprache: 123 });
  assert.equal(kundenzustandLesen(1).sprache, 'de');
  kundenzustandSchreiben(1, {});
  assert.equal(kundenzustandLesen(1).sprache, 'de');
});

test('Kundenzustand: design nur bei "dunkel" oder "hell" übernommen, sonst "dunkel"', () => {
  kundenzustandSchreiben(1, { design: 'hell' });
  assert.equal(kundenzustandLesen(1).design, 'hell');
  kundenzustandSchreiben(1, { design: 'dunkel' });
  assert.equal(kundenzustandLesen(1).design, 'dunkel');
  for (const wert of ['blau', 'Hell', '', 123, null, {}, ['hell'], true]) {
    kundenzustandSchreiben(1, { design: 'hell' });
    kundenzustandSchreiben(1, { design: wert });
    assert.equal(kundenzustandLesen(1).design, 'dunkel', `Wert ${JSON.stringify(wert)} müsste Dunkel ergeben`);
  }
  kundenzustandSchreiben(1, { design: 'hell' });
  kundenzustandSchreiben(1, {});
  assert.equal(kundenzustandLesen(1).design, 'dunkel');
});

test('Kundenzustand: summe_cent nur bei gültiger, nicht-negativer Zahl übernommen', () => {
  kundenzustandSchreiben(1, { summe_cent: -5 });
  assert.equal(kundenzustandLesen(1).summe_cent, null);
  kundenzustandSchreiben(1, { summe_cent: 'zehn' });
  assert.equal(kundenzustandLesen(1).summe_cent, null);
  kundenzustandSchreiben(1, { summe_cent: 0 });
  assert.equal(kundenzustandLesen(1).summe_cent, 0);
});

test('kassenNummerPruefen: ohne Angabe Kasse 1, Ziffern 1 bis 9 als Zahl oder Text', () => {
  assert.equal(kassenNummerPruefen(undefined), 1);
  assert.equal(kassenNummerPruefen(null), 1);
  assert.equal(kassenNummerPruefen(''), 1);
  assert.equal(kassenNummerPruefen(2), 2);
  assert.equal(kassenNummerPruefen('2'), 2);
  assert.equal(kassenNummerPruefen('9'), 9);
});

test('kassenNummerPruefen: alles andere ist ein Fehler mit Status 400 und deutschem Text', () => {
  for (const wert of [0, 10, '10', '2.5', ' 2', 'abc', -1, {}, 2.5, '0', [2], true]) {
    assert.throws(() => kassenNummerPruefen(wert), (fehler) => {
      assert.equal(fehler.status, 400);
      assert.equal(fehler.message, KASSENNUMMER_FEHLER);
      return true;
    }, `Wert ${JSON.stringify(wert)} müsste abgelehnt werden`);
  }
});

test('Kundenzustand: zwei Kassen schreiben verschiedene Warenkörbe, jede liest nur ihren eigenen', () => {
  kundenzustandSchreiben(3, { warenkorb: [{ artikel_name: 'Pommes' }], sprache: 'tr', design: 'hell' });
  kundenzustandSchreiben(4, { warenkorb: [{ artikel_name: 'Adana' }], summe_cent: 700 });
  assert.deepEqual(kundenzustandLesen(3), {
    warenkorb: [{ artikel_name: 'Pommes' }], fokus: null, summe_cent: null, sprache: 'tr', design: 'hell',
  });
  assert.deepEqual(kundenzustandLesen(4), {
    warenkorb: [{ artikel_name: 'Adana' }], fokus: null, summe_cent: 700, sprache: 'de', design: 'dunkel',
  });
  kundenzustandSchreiben(4, {});
  assert.equal(kundenzustandLesen(3).warenkorb[0].artikel_name, 'Pommes');
});

test('Kundenzustand: eine Kasse, die noch nie gemeldet hat, liest den Standardzustand', () => {
  const zustand = kundenzustandLesen(8);
  assert.deepEqual(zustand, { warenkorb: [], fokus: null, summe_cent: null, sprache: 'de', design: 'dunkel' });
  zustand.warenkorb.push({ artikel_name: 'Fremd' });
  assert.deepEqual(kundenzustandLesen(9).warenkorb, []);
});

test('Kasse kann Live-Zustand schreiben, nur mit Rolle kasse', async () => {
  const { app, db } = frischeApp();
  const kasse = await angemeldeterAgent(app, db, 'kasse');
  const admin = await angemeldeterAgent(app, db, 'admin');

  const antwort = await kasse.put('/api/kasse/kundenanzeige').send({
    warenkorb: [{ schluessel: 1, artikel_name: 'Pommes', farbe: '#f5c211', preis_cent: 350, beilagen: [] }],
    fokus: null,
    summe_cent: 350,
    sprache: 'tr',
  });
  assert.equal(antwort.status, 200);

  const zustand = (await request(app).get('/api/kunde/zustand')).body;
  assert.equal(zustand.warenkorb.length, 1);
  assert.equal(zustand.warenkorb[0].artikel_name, 'Pommes');
  assert.equal(zustand.summe_cent, 350);
  assert.equal(zustand.sprache, 'tr');

  assert.equal((await admin.put('/api/kasse/kundenanzeige').send({})).status, 403);
  assert.equal((await request(app).put('/api/kasse/kundenanzeige').send({})).status, 401);
});

test('Kundenanzeige je Kasse: PUT mit kasse 2 erscheint nur unter ?kasse=2', async () => {
  const { app, db } = frischeApp();
  const kasse = await angemeldeterAgent(app, db, 'kasse');
  await kasse.put('/api/kasse/kundenanzeige').send({ kasse: 1 });

  const antwort = await kasse.put('/api/kasse/kundenanzeige').send({
    kasse: 2, warenkorb: [{ artikel_name: 'Adana' }], summe_cent: 700,
  });
  assert.equal(antwort.status, 200);

  const zustandZwei = (await request(app).get('/api/kunde/zustand?kasse=2')).body;
  assert.equal(zustandZwei.warenkorb[0].artikel_name, 'Adana');
  assert.equal(zustandZwei.summe_cent, 700);
  const zustandEins = (await request(app).get('/api/kunde/zustand?kasse=1')).body;
  assert.deepEqual(zustandEins.warenkorb, []);
});

test('Kundenanzeige je Kasse: ohne Nummer sprechen PUT und GET Kasse 1 an', async () => {
  const { app, db } = frischeApp();
  const kasse = await angemeldeterAgent(app, db, 'kasse');
  await kasse.put('/api/kasse/kundenanzeige').send({ warenkorb: [{ artikel_name: 'Cola' }] });

  assert.equal((await request(app).get('/api/kunde/zustand?kasse=1')).body.warenkorb[0].artikel_name, 'Cola');
  assert.equal((await request(app).get('/api/kunde/zustand')).body.warenkorb[0].artikel_name, 'Cola');
});

test('Kundenanzeige je Kasse: ungültige Nummer ergibt 400 mit deutschem Text, Zustand unverändert', async () => {
  const { app, db } = frischeApp();
  const kasse = await angemeldeterAgent(app, db, 'kasse');
  await kasse.put('/api/kasse/kundenanzeige').send({ kasse: 5, warenkorb: [{ artikel_name: 'Pommes' }] });

  for (const ungueltig of [0, 10, '2.5', 'abc']) {
    const antwort = await kasse.put('/api/kasse/kundenanzeige').send({ kasse: ungueltig, warenkorb: [] });
    assert.equal(antwort.status, 400);
    assert.deepEqual(antwort.body, { fehler: KASSENNUMMER_FEHLER });
  }
  assert.equal((await request(app).get('/api/kunde/zustand?kasse=5')).body.warenkorb[0].artikel_name, 'Pommes');

  for (const ungueltig of ['0', '10', 'abc', '2.5']) {
    const antwort = await request(app).get(`/api/kunde/zustand?kasse=${ungueltig}`);
    assert.equal(antwort.status, 400);
    assert.deepEqual(antwort.body, { fehler: KASSENNUMMER_FEHLER });
  }
  assert.equal((await request(app).get('/api/kunde/zustand?kasse=1&kasse=2')).status, 400);
});

test('Kundenanzeige je Kasse: Rollen unverändert, GET liefert nur die fünf bekannten Felder', async () => {
  const { app, db } = frischeApp();
  const admin = await angemeldeterAgent(app, db, 'admin');
  assert.equal((await admin.put('/api/kasse/kundenanzeige').send({ kasse: 2 })).status, 403);
  assert.equal((await request(app).put('/api/kasse/kundenanzeige').send({ kasse: 2 })).status, 401);

  const antwort = await request(app).get('/api/kunde/zustand?kasse=2');
  assert.equal(antwort.status, 200);
  assert.deepEqual(Object.keys(antwort.body).sort(), ['design', 'fokus', 'sprache', 'summe_cent', 'warenkorb']);
});

test('Kundenanzeige: design der Kasse erscheint in der Kundenansicht, ungültige Werte werden Dunkel', async () => {
  const { app, db } = frischeApp();
  const kasse = await angemeldeterAgent(app, db, 'kasse');

  assert.equal((await request(app).get('/api/kunde/zustand')).body.design, 'dunkel');

  assert.equal((await kasse.put('/api/kasse/kundenanzeige').send({ design: 'hell' })).status, 200);
  assert.equal((await request(app).get('/api/kunde/zustand')).body.design, 'hell');

  assert.equal((await kasse.put('/api/kasse/kundenanzeige').send({ design: 'rot' })).status, 200);
  assert.equal((await request(app).get('/api/kunde/zustand')).body.design, 'dunkel');
});

test('Kundenanzeige je Kasse: jede Kasse hat ihr eigenes design', async () => {
  const { app, db } = frischeApp();
  const kasse = await angemeldeterAgent(app, db, 'kasse');
  await kasse.put('/api/kasse/kundenanzeige').send({ kasse: 1, design: 'hell' });
  await kasse.put('/api/kasse/kundenanzeige').send({ kasse: 2, design: 'dunkel' });
  await kasse.put('/api/kasse/kundenanzeige').send({ kasse: 2, design: 'dunkel', warenkorb: [] });

  assert.equal((await request(app).get('/api/kunde/zustand?kasse=1')).body.design, 'hell');
  assert.equal((await request(app).get('/api/kunde/zustand?kasse=2')).body.design, 'dunkel');
});

test('Kundenanzeige-Artikel: öffentlich, ohne Kosten, nur aktive/nicht gelöschte', async () => {
  const { app, db } = frischeApp();
  const admin = await angemeldeterAgent(app, db, 'admin');
  const ketchup = (await admin.post('/api/beilagen').send({ name: 'Ketchup', name_tr: 'Ketçap' })).body;
  await admin.post('/api/artikel').send({
    name: 'Pommes', name_tr: 'Patates', farbe: '#f5c211', preis_cent: 350, einkaufskosten_cent: 120,
    sortierung: 1, beilagen_ids: [ketchup.id],
  });
  await admin.post('/api/artikel').send({ name: 'Inaktiv', farbe: '#000000', preis_cent: 100, aktiv: 0 });

  const antwort = await request(app).get('/api/kunde/artikel');
  assert.equal(antwort.status, 200);
  assert.equal(antwort.body.length, 1);
  assert.equal(antwort.body[0].name, 'Pommes');
  assert.equal(antwort.body[0].einkaufskosten_cent, undefined);
  assert.deepEqual(antwort.body[0].beilagen.map((b) => b.name), ['Ketchup']);
  assert.equal(antwort.body[0].bild_url, null);
  assert.equal(antwort.body[0].name_tr, 'Patates');
  assert.deepEqual(antwort.body[0].beilagen.map((b) => b.name_tr), ['Ketçap']);
});
