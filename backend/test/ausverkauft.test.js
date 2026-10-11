import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { frischeApp, angemeldeterAgent, auditStand, auditSeit } from './helfer.js';

async function artikelAnlegen(admin, name, preis) {
  return (await admin.post('/api/artikel').send({
    name, farbe: '#333333', preis_cent: preis, beilagen_ids: [], sortierung: 1,
  })).body;
}

test('Kasse stellt einen Artikel auf ausverkauft und wieder zurück, beides wird protokolliert', async () => {
  const { app, db } = frischeApp();
  const admin = await angemeldeterAgent(app, db, 'admin');
  const cola = await artikelAnlegen(admin, 'Cola', 250);
  const kasse = await angemeldeterAgent(app, db, 'kasse');
  const stand = auditStand(db);

  const gesetzt = await kasse.put(`/api/artikel/${cola.id}/ausverkauft`).send({ ausverkauft: 1 });
  assert.equal(gesetzt.status, 200);
  assert.equal(gesetzt.body.einkaufskosten_cent, undefined);
  assert.equal(db.prepare('SELECT ausverkauft FROM artikel WHERE id = ?').get(cola.id).ausverkauft, 1);
  const zurueck = await kasse.put(`/api/artikel/${cola.id}/ausverkauft`).send({ ausverkauft: 0 });
  assert.equal(zurueck.status, 200);
  assert.equal(db.prepare('SELECT ausverkauft FROM artikel WHERE id = ?').get(cola.id).ausverkauft, 0);

  const eintraege = auditSeit(db, stand);
  assert.deepEqual(eintraege.map((e) => e.aktion), ['artikel_ausverkauft_gesetzt', 'artikel_ausverkauft_aufgehoben']);
  assert.equal(eintraege[0].rolle, 'kasse');
});

test('Ausverkauft setzen: Admin darf, Ausgabe und Gäste nicht, falsche Werte und fremde IDs werden abgelehnt', async () => {
  const { app, db } = frischeApp();
  const admin = await angemeldeterAgent(app, db, 'admin');
  const cola = await artikelAnlegen(admin, 'Cola', 250);
  const ausgabe = await angemeldeterAgent(app, db, 'ausgabe');
  const kasse = await angemeldeterAgent(app, db, 'kasse');

  assert.equal((await admin.put(`/api/artikel/${cola.id}/ausverkauft`).send({ ausverkauft: 1 })).status, 200);
  assert.equal((await ausgabe.put(`/api/artikel/${cola.id}/ausverkauft`).send({ ausverkauft: 0 })).status, 403);
  assert.equal((await request(app).put(`/api/artikel/${cola.id}/ausverkauft`).send({ ausverkauft: 0 })).status, 401);
  assert.equal(db.prepare('SELECT ausverkauft FROM artikel WHERE id = ?').get(cola.id).ausverkauft, 1);
  assert.equal((await kasse.put(`/api/artikel/${cola.id}/ausverkauft`).send({ ausverkauft: 'ja' })).status, 400);
  assert.equal((await kasse.put('/api/artikel/99999/ausverkauft').send({ ausverkauft: 1 })).status, 404);
});

test('Ausverkaufter Artikel erscheint in Kasse, Kundenanzeige und Admin-Liste als ausverkauft', async () => {
  const { app, db } = frischeApp();
  const admin = await angemeldeterAgent(app, db, 'admin');
  const cola = await artikelAnlegen(admin, 'Cola', 250);
  const kasse = await angemeldeterAgent(app, db, 'kasse');
  await kasse.put(`/api/artikel/${cola.id}/ausverkauft`).send({ ausverkauft: 1 });

  assert.equal((await kasse.get('/api/kasse/artikel')).body[0].ausverkauft, 1);
  assert.equal((await request(app).get('/api/kunde/artikel')).body[0].ausverkauft, 1);
  assert.equal((await admin.get('/api/artikel')).body[0].ausverkauft, 1);
});

test('Kassieren und Vorschau lehnen einen ausverkauften Artikel verständlich ab, nichts wird gebucht', async () => {
  const { app, db } = frischeApp();
  const admin = await angemeldeterAgent(app, db, 'admin');
  const cola = await artikelAnlegen(admin, 'Cola', 250);
  const kasse = await angemeldeterAgent(app, db, 'kasse');
  await kasse.put(`/api/artikel/${cola.id}/ausverkauft`).send({ ausverkauft: 1 });
  const positionen = [{ artikel_id: cola.id, beilagen_ids: [] }];

  const buchung = await kasse.post('/api/kasse/kassieren').send({ positionen });
  assert.equal(buchung.status, 409);
  assert.equal(buchung.body.fehler, '„Cola“ ist ausverkauft. Bitte Position entfernen.');
  assert.equal((await kasse.post('/api/kasse/kassieren-vorschau').send({ positionen })).status, 409);
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM kaertchen').get().n, 0);
  assert.equal(db.prepare('SELECT naechste_nummer FROM artikel WHERE id = ?').get(cola.id).naechste_nummer, 1);

  await kasse.put(`/api/artikel/${cola.id}/ausverkauft`).send({ ausverkauft: 0 });
  assert.equal((await kasse.post('/api/kasse/kassieren').send({ positionen })).status, 200);
});

test('Artikel bearbeiten und aktiv/inaktiv schalten ändert den Ausverkauft-Zustand nicht', async () => {
  const { app, db } = frischeApp();
  const admin = await angemeldeterAgent(app, db, 'admin');
  const cola = await artikelAnlegen(admin, 'Cola', 250);
  await admin.put(`/api/artikel/${cola.id}/ausverkauft`).send({ ausverkauft: 1 });

  await admin.put(`/api/artikel/${cola.id}`).send({ ...cola, preis_cent: 300, beilagen_ids: [] });
  await admin.put(`/api/artikel/${cola.id}/aktiv`).send({ aktiv: 0 });
  await admin.put(`/api/artikel/${cola.id}/aktiv`).send({ aktiv: 1 });
  assert.equal(db.prepare('SELECT ausverkauft FROM artikel WHERE id = ?').get(cola.id).ausverkauft, 1);
});
