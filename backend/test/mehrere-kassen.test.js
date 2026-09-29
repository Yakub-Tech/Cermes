import test from 'node:test';
import assert from 'node:assert/strict';
import { frischeApp, angemeldeterAgent, auditStand, auditSeit } from './helfer.js';

async function zweiKassenMitPommes() {
  const { app, db } = frischeApp();
  const admin = await angemeldeterAgent(app, db, 'admin');
  const pommes = (await admin.post('/api/artikel').send({
    name: 'Pommes', farbe: '#f5c211', preis_cent: 350, beilagen_ids: [], sortierung: 1,
  })).body;
  const kasseA = await angemeldeterAgent(app, db, 'kasse');
  const kasseB = await angemeldeterAgent(app, db, 'kasse');
  const positionen = [{ artikel_id: pommes.id, beilagen_ids: [] }];
  return { db, pommes, kasseA, kasseB, positionen };
}

function naechsteNummer(db, artikelId) {
  return db.prepare('SELECT naechste_nummer FROM artikel WHERE id = ?').get(artikelId).naechste_nummer;
}

test('Zwei Sitzungen desselben Kassen-Kontos bleiben gleichzeitig gültig und können beide buchen', async () => {
  const { db, kasseA, kasseB, positionen } = await zweiKassenMitPommes();

  const antwortA = await kasseA.post('/api/kasse/kassieren').send({ positionen });
  const antwortB = await kasseB.post('/api/kasse/kassieren').send({ positionen });
  assert.equal(antwortA.status, 200);
  assert.equal(antwortB.status, 200);
  assert.equal(antwortA.body.kaertchen[0].nummer, 1);
  assert.equal(antwortB.body.kaertchen[0].nummer, 2);
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM kaertchen').get().n, 2);
});

test('Vorschau-Konflikt: die langsamere Kasse bekommt 409, nichts wird gebucht, neue Vorschau gelingt', async () => {
  const { db, pommes, kasseA, kasseB, positionen } = await zweiKassenMitPommes();

  const vorschauA = (await kasseA.post('/api/kasse/kassieren-vorschau').send({ positionen })).body;
  const vorschauB = (await kasseB.post('/api/kasse/kassieren-vorschau').send({ positionen })).body;
  const nummernA = vorschauA.kaertchen.map((k) => k.nummer);
  const nummernB = vorschauB.kaertchen.map((k) => k.nummer);
  assert.deepEqual(nummernA, [1]);
  assert.deepEqual(nummernB, [1]);

  const buchungB = await kasseB.post('/api/kasse/kassieren').send({ positionen, erwartete_nummern: nummernB });
  assert.equal(buchungB.status, 200);

  const vorgaengeVorher = db.prepare('SELECT COUNT(*) AS n FROM kassiervorgang').get().n;
  const kaertchenVorher = db.prepare('SELECT COUNT(*) AS n FROM kaertchen').get().n;
  const buchungA = await kasseA.post('/api/kasse/kassieren').send({ positionen, erwartete_nummern: nummernA });
  assert.equal(buchungA.status, 409);
  assert.ok(buchungA.body.fehler.includes('Die Kärtchen-Nummern haben sich inzwischen geändert'));
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM kassiervorgang').get().n, vorgaengeVorher);
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM kaertchen').get().n, kaertchenVorher);
  assert.equal(naechsteNummer(db, pommes.id), 2);

  const neueVorschauA = (await kasseA.post('/api/kasse/kassieren-vorschau').send({ positionen })).body;
  const neueNummernA = neueVorschauA.kaertchen.map((k) => k.nummer);
  assert.deepEqual(neueNummernA, [2]);
  const zweiterVersuchA = await kasseA.post('/api/kasse/kassieren').send({ positionen, erwartete_nummern: neueNummernA });
  assert.equal(zweiterVersuchA.status, 200);
  assert.equal(zweiterVersuchA.body.kaertchen[0].nummer, 2);
});

test('Zehn gleichzeitige Buchungen von zwei Kassen ergeben zehn verschiedene, lückenlose Nummern', async () => {
  const { kasseA, kasseB, positionen } = await zweiKassenMitPommes();

  const anfragen = [];
  for (let i = 0; i < 10; i++) {
    const kasse = i % 2 === 0 ? kasseA : kasseB;
    anfragen.push(kasse.post('/api/kasse/kassieren').send({ positionen, vorgang_kennung: `mehrkassen-${i}` }));
  }
  const antworten = await Promise.all(anfragen);

  const nummern = [];
  for (const antwort of antworten) {
    assert.equal(antwort.status, 200);
    nummern.push(antwort.body.kaertchen[0].nummer);
  }
  nummern.sort((a, b) => a - b);
  assert.deepEqual(nummern, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
});

test('Zwei Kassen stornieren gleichzeitig dasselbe Kärtchen: genau ein Storno, ein Audit-Eintrag', async () => {
  const { db, kasseA, kasseB, positionen } = await zweiKassenMitPommes();
  const buchung = (await kasseA.post('/api/kasse/kassieren').send({ positionen })).body;
  const kaertchenId = buchung.kaertchen[0].id;

  const stand = auditStand(db);
  const antworten = await Promise.all([
    kasseA.post(`/api/kasse/storno/${kaertchenId}`),
    kasseB.post(`/api/kasse/storno/${kaertchenId}`),
  ]);
  const status = antworten.map((antwort) => antwort.status).sort();
  assert.deepEqual(status, [200, 409]);

  const stornoEintraege = auditSeit(db, stand).filter((eintrag) => eintrag.aktion === 'storniert');
  assert.equal(stornoEintraege.length, 1);
  assert.equal(db.prepare('SELECT status FROM kaertchen WHERE id = ?').get(kaertchenId).status, 'storniert');
});
