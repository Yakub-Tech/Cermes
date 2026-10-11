import test from 'node:test';
import assert from 'node:assert/strict';
import { frischeApp, angemeldeterAgent } from './helfer.js';

async function artikelAnlegen(app, db) {
  const admin = await angemeldeterAgent(app, db, 'admin');
  return (await admin.post('/api/artikel').send({
    name: 'Adana', farbe: '#2255cc', preis_cent: 700, beilagen_ids: [], sortierung: 1,
  })).body;
}

test('Sonderwunsch wird getrimmt gespeichert und in Vorschau, Antwort, Belegen und Ausgabe gezeigt', async () => {
  const { app, db } = frischeApp();
  const adana = await artikelAnlegen(app, db);
  const kasse = await angemeldeterAgent(app, db, 'kasse');
  const positionen = [
    { artikel_id: adana.id, beilagen_ids: [], sonderwunsch: '  ohne Zwiebel  ' },
    { artikel_id: adana.id, beilagen_ids: [] },
  ];

  const vorschau = (await kasse.post('/api/kasse/kassieren-vorschau').send({ positionen })).body;
  assert.equal(vorschau.kaertchen[0].sonderwunsch, 'ohne Zwiebel');
  assert.equal(vorschau.kaertchen[1].sonderwunsch, null);

  const ergebnis = (await kasse.post('/api/kasse/kassieren').send({ positionen })).body;
  assert.equal(ergebnis.kaertchen[0].sonderwunsch, 'ohne Zwiebel');
  const gespeichert = db.prepare('SELECT sonderwunsch FROM kaertchen ORDER BY id').all();
  assert.deepEqual(gespeichert.map((z) => z.sonderwunsch), ['ohne Zwiebel', null]);

  const belegen = await angemeldeterAgent(app, db, 'belegen');
  const liste = (await belegen.get('/api/belegen/kaertchen')).body.in_bearbeitung;
  assert.equal(liste.filter((k) => k.sonderwunsch === 'ohne Zwiebel').length, 1);
  assert.equal(liste.filter((k) => k.sonderwunsch === null).length, 1);

  const stornierbar = (await kasse.get('/api/kasse/stornierbar')).body;
  assert.ok(stornierbar.some((k) => k.sonderwunsch === 'ohne Zwiebel'));
});

test('Ausgabe zeigt den Sonderwunsch, TV und Kundenanzeige nicht', async () => {
  const { app, db } = frischeApp();
  const adana = await artikelAnlegen(app, db);
  const kasse = await angemeldeterAgent(app, db, 'kasse');
  await kasse.post('/api/kasse/kassieren').send({
    positionen: [{ artikel_id: adana.id, beilagen_ids: [], sonderwunsch: 'scharf' }],
  });
  db.prepare("UPDATE kaertchen SET status = 'abholbereit'").run();

  const ausgabe = await angemeldeterAgent(app, db, 'ausgabe');
  assert.equal((await ausgabe.get('/api/ausgabe/kaertchen')).body.abholbereit[0].sonderwunsch, 'scharf');

  const tv = await ausgabe.get('/api/tv/kaertchen');
  assert.ok(!JSON.stringify(tv.body).includes('scharf'));
  assert.ok(!JSON.stringify((await ausgabe.get('/api/kunde/artikel')).body).includes('onderwunsch'));
});

test('Zu langer oder ungültiger Sonderwunsch wird mit Laientext abgelehnt', async () => {
  const { app, db } = frischeApp();
  const adana = await artikelAnlegen(app, db);
  const kasse = await angemeldeterAgent(app, db, 'kasse');
  for (const wert of ['x'.repeat(101), 42, { a: 1 }]) {
    const antwort = await kasse.post('/api/kasse/kassieren').send({
      positionen: [{ artikel_id: adana.id, beilagen_ids: [], sonderwunsch: wert }],
    });
    assert.equal(antwort.status, 400);
    assert.match(antwort.body.fehler, /Sonderwunsch/);
  }
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM kaertchen').get().n, 0);
});

test('Leerer oder nur aus Leerzeichen bestehender Sonderwunsch zählt als keiner, genau 100 Zeichen sind erlaubt', async () => {
  const { app, db } = frischeApp();
  const adana = await artikelAnlegen(app, db);
  const kasse = await angemeldeterAgent(app, db, 'kasse');
  const antwort = await kasse.post('/api/kasse/kassieren').send({
    positionen: [
      { artikel_id: adana.id, beilagen_ids: [], sonderwunsch: '   ' },
      { artikel_id: adana.id, beilagen_ids: [], sonderwunsch: 'y'.repeat(100) },
    ],
  });
  assert.equal(antwort.status, 200);
  assert.equal(antwort.body.kaertchen[0].sonderwunsch, null);
  assert.equal(antwort.body.kaertchen[1].sonderwunsch.length, 100);
});
