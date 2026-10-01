import test from 'node:test';
import assert from 'node:assert/strict';
import { frischeApp, angemeldeterAgent, auditStand, auditSeit } from './helfer.js';

async function bestellung(admin, kasse, sonderwunsch = 'ohne Zwiebel') {
  const beilage = (await admin.post('/api/beilagen').send({ name: 'Salat' })).body;
  const artikel = (await admin.post('/api/artikel').send({
    name: 'Adana', farbe: '#f5c211', preis_cent: 900, beilagen_ids: [beilage.id], sortierung: 1,
  })).body;
  const ergebnis = (await kasse.post('/api/kasse/kassieren').send({
    positionen: [{ artikel_id: artikel.id, beilagen_ids: [beilage.id], sonderwunsch }],
  })).body;
  return ergebnis.kaertchen[0];
}

test('Storno aus "In Bearbeitung" meldet der Küche die Portion mit allen Angaben', async () => {
  const { app, db } = frischeApp();
  const admin = await angemeldeterAgent(app, db, 'admin');
  const kasse = await angemeldeterAgent(app, db, 'kasse');
  const belegen = await angemeldeterAgent(app, db, 'belegen');
  const kaertchen = await bestellung(admin, kasse);

  await kasse.post(`/api/kasse/storno/${kaertchen.id}`);

  const liste = (await belegen.get('/api/belegen/kaertchen')).body;
  assert.equal(liste.storniert.length, 1);
  assert.equal(liste.storniert[0].nummer, kaertchen.nummer);
  assert.equal(liste.storniert[0].artikel_name, 'Adana');
  assert.deepEqual(liste.storniert[0].beilagen, ['Salat']);
  assert.equal(liste.storniert[0].sonderwunsch, 'ohne Zwiebel');
  assert.equal(liste.in_bearbeitung.length, 0);
});

test('Storno aus "Abholbereit" meldet der Küche nichts, die Portion ist ja fertig', async () => {
  const { app, db } = frischeApp();
  const admin = await angemeldeterAgent(app, db, 'admin');
  const kasse = await angemeldeterAgent(app, db, 'kasse');
  const belegen = await angemeldeterAgent(app, db, 'belegen');
  const kaertchen = await bestellung(admin, kasse);
  await belegen.post(`/api/belegen/status/${kaertchen.id}`).send({ status: 'abholbereit' });
  await kasse.post(`/api/kasse/storno/${kaertchen.id}`);

  assert.equal((await belegen.get('/api/belegen/kaertchen')).body.storniert.length, 0);
});

test('Der Hinweis bleibt bis zum Quittieren, danach verschwindet er, Audit-Eintrag und Status bleiben', async () => {
  const { app, db } = frischeApp();
  const admin = await angemeldeterAgent(app, db, 'admin');
  const kasse = await angemeldeterAgent(app, db, 'kasse');
  const belegen = await angemeldeterAgent(app, db, 'belegen');
  const kaertchen = await bestellung(admin, kasse);
  await kasse.post(`/api/kasse/storno/${kaertchen.id}`);
  assert.equal((await belegen.get('/api/belegen/kaertchen')).body.storniert.length, 1);

  const stand = auditStand(db);
  const antwort = await belegen.post(`/api/belegen/storno-quittieren/${kaertchen.id}`);
  assert.equal(antwort.status, 200);
  assert.equal((await belegen.get('/api/belegen/kaertchen')).body.storniert.length, 0);
  assert.equal(db.prepare('SELECT status FROM kaertchen WHERE id = ?').get(kaertchen.id).status, 'storniert');

  const eintraege = auditSeit(db, stand);
  assert.equal(eintraege.length, 1);
  assert.equal(eintraege[0].aktion, 'storno_quittiert');
  assert.equal(eintraege[0].bereich, 'storno');
  assert.equal(eintraege[0].benutzername, 'test-belegen');
  assert.equal(eintraege[0].details.werte.nummer, kaertchen.nummer);

  const nochmal = await belegen.post(`/api/belegen/storno-quittieren/${kaertchen.id}`);
  assert.equal(nochmal.status, 200);
  assert.equal(auditSeit(db, stand).length, 1);
});

test('Quittieren darf nur die Rolle Belegen (wie die ganze Belegen-Ansicht), ein unbekanntes Kärtchen gibt einen Laientext', async () => {
  const { app, db } = frischeApp();
  const admin = await angemeldeterAgent(app, db, 'admin');
  const kasse = await angemeldeterAgent(app, db, 'kasse');
  const ausgabe = await angemeldeterAgent(app, db, 'ausgabe');
  const kaertchen = await bestellung(admin, kasse);
  await kasse.post(`/api/kasse/storno/${kaertchen.id}`);

  assert.equal((await kasse.post(`/api/belegen/storno-quittieren/${kaertchen.id}`)).status, 403);
  assert.equal((await ausgabe.post(`/api/belegen/storno-quittieren/${kaertchen.id}`)).status, 403);
  assert.equal((await admin.post(`/api/belegen/storno-quittieren/${kaertchen.id}`)).status, 403);
  const belegen = await angemeldeterAgent(app, db, 'belegen');
  assert.equal((await belegen.post('/api/belegen/storno-quittieren/99999')).status, 404);
  assert.equal((await belegen.post(`/api/belegen/storno-quittieren/${kaertchen.id}`)).status, 200);
});
