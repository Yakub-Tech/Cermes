import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { kundenzustandLesen, kundenzustandSchreiben } from '../src/kundenzustand.js';
import { frischeApp, angemeldeterAgent } from './helfer.js';

test('Kundenzustand: Standardwert leer, Schreiben und Lesen', () => {
  assert.deepEqual(kundenzustandLesen(), { warenkorb: [], fokus: null, summe_cent: null });
  kundenzustandSchreiben({
    warenkorb: [{ artikel_name: 'Pommes' }], fokus: { artikel_name: 'Pommes' }, summe_cent: 350,
  });
  assert.deepEqual(kundenzustandLesen(), {
    warenkorb: [{ artikel_name: 'Pommes' }], fokus: { artikel_name: 'Pommes' }, summe_cent: 350,
  });
});

test('Kundenzustand: unvollständige Daten werden robust auf leer/null abgebildet', () => {
  kundenzustandSchreiben({});
  assert.deepEqual(kundenzustandLesen(), { warenkorb: [], fokus: null, summe_cent: null });
});

test('Kundenzustand: summe_cent nur bei gültiger, nicht-negativer Zahl übernommen', () => {
  kundenzustandSchreiben({ summe_cent: -5 });
  assert.equal(kundenzustandLesen().summe_cent, null);
  kundenzustandSchreiben({ summe_cent: 'zehn' });
  assert.equal(kundenzustandLesen().summe_cent, null);
  kundenzustandSchreiben({ summe_cent: 0 });
  assert.equal(kundenzustandLesen().summe_cent, 0);
});

test('Kasse kann Live-Zustand schreiben, nur mit Rolle kasse', async () => {
  const { app, db } = frischeApp();
  const kasse = await angemeldeterAgent(app, db, 'kasse');
  const admin = await angemeldeterAgent(app, db, 'admin');

  const antwort = await kasse.put('/api/kasse/kundenanzeige').send({
    warenkorb: [{ schluessel: 1, artikel_name: 'Pommes', farbe: '#f5c211', preis_cent: 350, beilagen: [] }],
    fokus: null,
    summe_cent: 350,
  });
  assert.equal(antwort.status, 200);

  const zustand = (await request(app).get('/api/kunde/zustand')).body;
  assert.equal(zustand.warenkorb.length, 1);
  assert.equal(zustand.warenkorb[0].artikel_name, 'Pommes');
  assert.equal(zustand.summe_cent, 350);

  assert.equal((await admin.put('/api/kasse/kundenanzeige').send({})).status, 403);
  assert.equal((await request(app).put('/api/kasse/kundenanzeige').send({})).status, 401);
});

test('Kundenanzeige-Artikel: öffentlich, ohne Kosten, nur aktive/nicht gelöschte', async () => {
  const { app, db } = frischeApp();
  const admin = await angemeldeterAgent(app, db, 'admin');
  const ketchup = (await admin.post('/api/beilagen').send({ name: 'Ketchup' })).body;
  await admin.post('/api/artikel').send({
    name: 'Pommes', farbe: '#f5c211', preis_cent: 350, einkaufskosten_cent: 120,
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
});
