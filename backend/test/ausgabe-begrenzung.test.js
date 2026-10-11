import test from 'node:test';
import assert from 'node:assert/strict';
import { frischeApp, angemeldeterAgent } from './helfer.js';
import { jetztIso } from '../src/zeit.js';

test('Ausgabe liest nur die 30 zuletzt abgeholten Kärtchen, offene vollständig', async () => {
  const { app, db } = frischeApp();
  const admin = await angemeldeterAgent(app, db, 'admin');
  const ausgabe = await angemeldeterAgent(app, db, 'ausgabe');
  const artikel = (await admin.post('/api/artikel').send({
    name: 'Pommes', farbe: '#f5c211', preis_cent: 350, beilagen_ids: [], sortierung: 1,
  })).body;
  const heute = jetztIso().slice(0, 10);
  const benutzer = db.prepare('SELECT id FROM benutzer WHERE benutzername = ?').get('test-ausgabe');
  const vorgang = db.prepare(
    'INSERT INTO kassiervorgang (zeitpunkt, summe_cent, benutzer_id) VALUES (?, 0, ?)'
  ).run(jetztIso(), benutzer.id).lastInsertRowid;
  const einfuegen = db.prepare(
    `INSERT INTO kaertchen (kassiervorgang_id, artikel_id, nummer, artikel_name, artikel_farbe,
       preis_cent, beilagen, status, erstellt_am, abgeholt_am)
     VALUES (${vorgang}, ?, ?, 'Pommes', '#f5c211', 350, ?, ?, ?, ?)`
  );
  for (let nummer = 1; nummer <= 45; nummer += 1) {
    const zeit = `${heute}T10:${String(nummer).padStart(2, '0')}:00`;
    const beilagen = nummer <= 15 ? 'kein-json' : '[]';
    einfuegen.run(artikel.id, nummer, beilagen, 'abgeholt', zeit, zeit);
  }
  for (let nummer = 101; nummer <= 140; nummer += 1) {
    einfuegen.run(artikel.id, nummer, '[]', 'abholbereit', `${heute}T09:00:00`, null);
  }

  const antwort = await ausgabe.get('/api/ausgabe/kaertchen');

  assert.equal(antwort.status, 200);
  assert.equal(antwort.body.abholbereit.length, 40);
  assert.deepEqual(
    antwort.body.zuletzt_abgeholt.map((k) => k.nummer),
    Array.from({ length: 30 }, (_, i) => 45 - i)
  );
});
