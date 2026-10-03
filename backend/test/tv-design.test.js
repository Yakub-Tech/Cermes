import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Database from 'better-sqlite3';
import request from 'supertest';
import { frischeApp, angemeldeterAgent, auditStand, auditSeit } from './helfer.js';
import { migrationenAusfuehren } from '../src/db.js';

const migrationenOrdner = path.join(path.dirname(fileURLToPath(import.meta.url)), '../src/migrationen');

function tvDesignSetzen(db, wert) {
  db.prepare(
    `INSERT INTO einstellung (schluessel, wert) VALUES ('tv_design', ?)
     ON CONFLICT(schluessel) DO UPDATE SET wert = excluded.wert`
  ).run(wert);
}

function tvDesignInDatenbank(db) {
  return db.prepare("SELECT wert FROM einstellung WHERE schluessel = 'tv_design'").get()?.wert;
}

test('Migration 018: eine neue Datenbank startet mit tv_design dunkel', () => {
  const db = new Database(':memory:');
  migrationenAusfuehren(db);
  assert.equal(tvDesignInDatenbank(db), 'dunkel');
});

test('Migration 018: eine bestehende Anlage behält ihre Einstellungen und bekommt dunkel', () => {
  const ordnerBis17 = fs.mkdtempSync(path.join(os.tmpdir(), 'cermes-migration-'));
  const dateienBis17 = fs.readdirSync(migrationenOrdner).filter((datei) => Number(datei.split('-')[0]) <= 17);
  for (const datei of dateienBis17) {
    fs.copyFileSync(path.join(migrationenOrdner, datei), path.join(ordnerBis17, datei));
  }
  const db = new Database(':memory:');
  migrationenAusfuehren(db, ordnerBis17);
  assert.equal(db.pragma('user_version', { simple: true }), 17);
  assert.equal(tvDesignInDatenbank(db), undefined);
  db.prepare("UPDATE einstellung SET wert = '40' WHERE schluessel = 'abholbereit_warnminuten'").run();

  migrationenAusfuehren(db);

  assert.equal(tvDesignInDatenbank(db), 'dunkel');
  assert.equal(db.prepare("SELECT wert FROM einstellung WHERE schluessel = 'abholbereit_warnminuten'").get().wert, '40');
});

test('GET /api/tv/design: ohne Anmeldung, genau dieser eine Wert', async () => {
  const { app, db } = frischeApp();
  tvDesignSetzen(db, 'dunkel');

  const antwort = await request(app).get('/api/tv/design');

  assert.equal(antwort.status, 200);
  assert.deepEqual(antwort.body, { design: 'dunkel' });
});

test('tv_design: Admin ändert, TV und Einstellungen zeigen den neuen Wert, Zahlen bleiben Zahlen', async () => {
  const { app, db } = frischeApp();
  tvDesignSetzen(db, 'dunkel');
  const admin = await angemeldeterAgent(app, db, 'admin');

  const antwort = await admin.put('/api/einstellungen').send({ tv_design: 'hell' });

  assert.equal(antwort.status, 200);
  assert.equal(antwort.body.tv_design, 'hell');
  assert.equal(typeof antwort.body.abholbereit_warnminuten, 'number');
  assert.equal(typeof antwort.body.inaktivitaets_abmeldung_minuten, 'number');
  assert.deepEqual((await request(app).get('/api/tv/design')).body, { design: 'hell' });

  const ausgabe = await angemeldeterAgent(app, db, 'ausgabe');
  const gelesen = (await ausgabe.get('/api/einstellungen')).body;
  assert.equal(gelesen.tv_design, 'hell');
  assert.equal(typeof gelesen.abholbereit_warnminuten, 'number');

  await admin.put('/api/einstellungen').send({ tv_design: 'dunkel' });
  assert.deepEqual((await request(app).get('/api/tv/design')).body, { design: 'dunkel' });
});

test('tv_design: nur der Admin darf ändern', async () => {
  const { app, db } = frischeApp();
  tvDesignSetzen(db, 'dunkel');
  for (const rolle of ['kasse', 'verwaltung', 'ausgabe', 'belegen']) {
    const agent = await angemeldeterAgent(app, db, rolle);
    assert.equal((await agent.put('/api/einstellungen').send({ tv_design: 'hell' })).status, 403, rolle);
  }
  assert.equal((await request(app).put('/api/einstellungen').send({ tv_design: 'hell' })).status, 401);
  assert.equal(tvDesignInDatenbank(db), 'dunkel');
});

test('tv_design: ungültige Werte werden abgelehnt und ändern nichts', async () => {
  const { app, db } = frischeApp();
  tvDesignSetzen(db, 'dunkel');
  db.prepare("UPDATE einstellung SET wert = '15' WHERE schluessel = 'abholbereit_warnminuten'").run();
  const admin = await angemeldeterAgent(app, db, 'admin');
  const stand = auditStand(db);

  for (const wert of ['blau', 'Hell', '', 123, null, {}, ['hell'], true]) {
    const antwort = await admin.put('/api/einstellungen').send({ tv_design: wert });
    assert.equal(antwort.status, 400, `Wert ${JSON.stringify(wert)} müsste abgelehnt werden`);
    assert.match(antwort.body.fehler, /dunkel/);
  }

  const gemischt = await admin.put('/api/einstellungen').send({ abholbereit_warnminuten: 33, tv_design: 'blau' });
  assert.equal(gemischt.status, 400);
  assert.equal(db.prepare("SELECT wert FROM einstellung WHERE schluessel = 'abholbereit_warnminuten'").get().wert, '15');
  assert.equal(tvDesignInDatenbank(db), 'dunkel');
  assert.equal(auditSeit(db, stand).length, 0);
});

test('tv_design: ein Speichern ohne das Feld lässt den Wert unverändert', async () => {
  const { app, db } = frischeApp();
  tvDesignSetzen(db, 'hell');
  const admin = await angemeldeterAgent(app, db, 'admin');

  const antwort = await admin.put('/api/einstellungen').send({ abholbereit_warnminuten: 16 });

  assert.equal(antwort.status, 200);
  assert.equal(antwort.body.tv_design, 'hell');
  assert.equal(tvDesignInDatenbank(db), 'hell');
  await admin.put('/api/einstellungen').send({ abholbereit_warnminuten: 15 });
  tvDesignSetzen(db, 'dunkel');
});

test('tv_design: die Änderung steht im Audit-Protokoll, eine unveränderte Wahl nicht', async () => {
  const { app, db } = frischeApp();
  tvDesignSetzen(db, 'dunkel');
  const admin = await angemeldeterAgent(app, db, 'admin');
  const stand = auditStand(db);

  await admin.put('/api/einstellungen').send({ tv_design: 'dunkel' });
  assert.equal(auditSeit(db, stand).length, 0);

  await admin.put('/api/einstellungen').send({ tv_design: 'hell' });
  const eintraege = auditSeit(db, stand);
  assert.equal(eintraege.length, 1);
  assert.equal(eintraege[0].bereich, 'einstellungen');
  assert.equal(eintraege[0].aktion, 'einstellungen_geaendert');
  assert.deepEqual(eintraege[0].details.aenderungen.tv_design, { vorher: 'dunkel', nachher: 'hell' });
  tvDesignSetzen(db, 'dunkel');
});

test('tv_design: fehlende oder ungültige Zeile ergibt Dunkel, ein Speichern legt sie wieder an', async () => {
  const { app, db } = frischeApp();
  const admin = await angemeldeterAgent(app, db, 'admin');

  tvDesignSetzen(db, 'blau');
  assert.deepEqual((await request(app).get('/api/tv/design')).body, { design: 'dunkel' });
  assert.equal((await admin.get('/api/einstellungen')).body.tv_design, 'dunkel');

  db.prepare("DELETE FROM einstellung WHERE schluessel = 'tv_design'").run();
  assert.deepEqual((await request(app).get('/api/tv/design')).body, { design: 'dunkel' });
  assert.equal((await admin.get('/api/einstellungen')).body.tv_design, 'dunkel');

  assert.equal((await admin.put('/api/einstellungen').send({ tv_design: 'hell' })).status, 200);
  assert.deepEqual((await request(app).get('/api/tv/design')).body, { design: 'hell' });
  tvDesignSetzen(db, 'dunkel');
});
